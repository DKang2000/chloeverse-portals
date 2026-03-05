import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import Game from '@/Game.js'
import View from '@/View/View.js'
import Debug from '@/Debug/Debug.js'
import State from '@/State/State.js'

const DOOR_MODEL_URL = '/infinite-world/assets/portal/door.glb?v=doorcapsule3'
const DOOR_FRAME_TOKEN = 'door_frame'
const DOOR_SLAB_TOKEN = 'door_slab'
const DOOR_LIGHT_HEMI_INTENSITY = 1.0
const DOOR_LIGHT_KEY_INTENSITY = 1.25
const DOOR_YAW_OFFSET = 0
const DOOR_UNIFORM_SCALE = 2.00
const DOOR_WORLD_OFFSET_X = 2.40
const DOOR_SINK_OFFSET_Y = -1.40
const DOOR_WORLD_OFFSET_Y = -0.20
const DOOR_OPEN_DEGREES = 150
const DOOR_OPEN_DURATION = 1.2
const DOOR_NAVIGATE_URL = '/collabs/reels'
const DOOR_SIGN_TEST_RADIANS = THREE.MathUtils.degToRad(8)
const HINGE_NUDGE_X = 0.0
const HINGE_CLEARANCE = 0.0025
const HINGE_MATCH_SAMPLE_COUNT = 220
const PORTAL_PULL_DURATION = 3.0
const PORTAL_FILL_OPACITY_MAX = 1.0
const PORTAL_FILL_EMISSIVE_MAX = 16.0
const PORTAL_LIGHT_INTENSITY_MAX = 20.0
const PORTAL_LOG_INTERVAL_SECONDS = 0.14
const PORTAL_FILL_SLAB_MATCH_RATIO = 0.99
const PORTAL_FILL_DEPTH_OFFSET = 0.03
const PORTAL_WHITEOUT_START_PROGRESS = 0.88
const PORTAL_WHITEOUT_HOLD_DURATION = 0.5
const PORTAL_NAVIGATE_WHITEOUT_DELAY_MS = 90
const PORTAL_HARD_WHITE_LOCK_PROGRESS = 0.96
const PORTAL_PULL_EXTRA_DEPTH = 40.0
const PORTAL_PULL_RIGHT_BIAS = 0.04
const PORTAL_RECENTER_DURATION = 0.38
const PORTAL_RECENTER_POSITION_EPSILON = 0.01
const PORTAL_RECENTER_ANGLE_EPSILON = THREE.MathUtils.degToRad(0.5)
const PORTAL_CAMERA_DISTANCE_END = 0.02
const PORTAL_CAMERA_ABOVE_END = 0.03
const doorLoader = new GLTFLoader()

export default class Player
{
    constructor()
    {
        this.game = Game.getInstance()
        this.state = State.getInstance()
        this.view = View.getInstance()
        this.debug = Debug.getInstance()

        this.scene = this.view.scene

        this.setGroup()
        this.setHelper()
        this.setDebug()
    }

    setGroup()
    {
        this.group = new THREE.Group()
        this.scene.add(this.group)
    }
    
    setHelper()
    {
        this.helper = new THREE.Group()
        this.group.add(this.helper)
        console.info('[door-config]', {
            scale: DOOR_UNIFORM_SCALE,
            offsetX: DOOR_WORLD_OFFSET_X,
            offsetY: DOOR_WORLD_OFFSET_Y,
            sinkY: DOOR_SINK_OFFSET_Y
        })
        this.fixedDoorYaw = null
        this.doorOpenSign = 1
        this.doorOpenTargetRadians = THREE.MathUtils.degToRad(DOOR_OPEN_DEGREES)
        this.doorOpening = false
        this.doorOpened = false
        this.doorNavigateTriggered = false
        this.doorOpenStartTime = 0
        this.lastDoorRotationLogTime = -Infinity
        this.portalPhase = 'idle'
        this.portalPhaseStartTime = 0
        this.portalSequenceActive = false
        this.portalPullStart = null
        this.portalPullTargetBase = null
        this.portalPullTarget = null
        this.portalWhiteoutStartOpacity = 0
        this.portalCameraDistanceStart = null
        this.portalCameraAboveStart = null
        this.portalDoorFrozenGroupPosition = null
        this.portalMovementDisabledLogged = false
        this.portalEntryPoseCaptured = false
        this.portalEntryPlayerWorld = null
        this.portalEntryCameraTheta = null
        this.portalEntryCameraPhi = null
        this.portalEntryCameraDistance = null
        this.portalEntryCameraAbove = null
        this.portalRecenterStart = null
        this.portalRecenterTarget = null
        this.portalRecenterCameraThetaStart = null
        this.portalRecenterCameraThetaTarget = null
        this.portalRecenterCameraPhiStart = null
        this.portalRecenterCameraPhiTarget = null
        this.portalRecenterCameraDistanceStart = null
        this.portalRecenterCameraDistanceTarget = null
        this.portalRecenterCameraAboveStart = null
        this.portalRecenterCameraAboveTarget = null
        this.lastPortalPositionLogTime = -Infinity
        this.raycaster = new THREE.Raycaster()
        this.pointerNdc = new THREE.Vector2()
        this.handlePointerDownCapture = this.handlePointerDownCapture.bind(this)
        this.ensurePortalWhiteOverlay()
        this.ensureLookHintOverlay()
        this.setDoorLightRig()
        this.setDoorInteraction()
        this.loadDoorModel()

        // const arrow = new THREE.Mesh(
        //     new THREE.ConeGeometry(0.2, 0.2, 4),
        //     new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false })
        // )
        // arrow.rotation.x = - Math.PI * 0.5
        // arrow.position.y = 1.5
        // arrow.position.z = - 0.5
        // this.helper.add(arrow)
        
        // // Axis helper
        // this.axisHelper = new THREE.AxesHelper(3)
        // this.group.add(this.axisHelper)
    }

    loadDoorModel()
    {
        doorLoader.load(
            DOOR_MODEL_URL,
            (gltf) =>
            {
                const model = gltf.scene
                this.removeExistingDoorModel()
                this.doorModelRoot = model
                model.scale.setScalar(DOOR_UNIFORM_SCALE)

                const { doorFrame, doorSlab } = this.findDoorNodes(model)
                this.doorFrameNode = doorFrame
                this.doorSlabNode = doorSlab
                this.hideNonDoorNodes(model, doorFrame, doorSlab)

                // Match old capsule anchoring: center on X/Z, feet on Y=0,
                // using only frame+door nodes to avoid hidden backup nodes skewing bounds.
                const visibleDoorBounds = this.getDoorBounds(doorFrame, doorSlab)
                if(visibleDoorBounds)
                {
                    const modelCenter = visibleDoorBounds.getCenter(new THREE.Vector3())
                    model.position.x -= modelCenter.x
                    model.position.z -= modelCenter.z
                    model.position.y -= visibleDoorBounds.min.y
                    model.position.y += DOOR_SINK_OFFSET_Y
                }
                model.updateWorldMatrix(true, true)
                this.setupDoorHingePivot(model, doorSlab)
                this.logDoorHingeDebug()

                // Keep GLB exactly as authored: no runtime material replacement.
                this.helper.add(model)
                if(this.ensurePortalFillReady())
                    this.updatePortalFillVisuals(0)
                this.capturePortalEntryPoseOnce()
                this.logDoorDebugInfo(model, doorFrame, doorSlab)
            },
            undefined,
            (error) =>
            {
                console.error('Failed to load door model for player helper', error)
            }
        )
    }

    removeExistingDoorModel()
    {
        if(!this.doorModelRoot)
            return

        if(this.doorModelRoot.parent)
            this.doorModelRoot.parent.remove(this.doorModelRoot)
        this.doorModelRoot = null
        this.doorFrameNode = null
        this.doorSlabNode = null
        this.doorHingePivot = null
        this.doorLocalBounds = null
        this.removePortalFill()
        this.resetPortalSequenceState()
        this.doorOpening = false
        this.doorOpened = false
        this.doorNavigateTriggered = false
    }

    setDoorInteraction()
    {
        const canvas = this.view?.renderer?.instance?.domElement
        if(!canvas)
            return

        canvas.addEventListener('pointerdown', this.handlePointerDownCapture, true)
    }

    ensurePortalWhiteOverlay()
    {
        if(this.portalWhiteOverlay)
            return

        const overlay = document.createElement('div')
        overlay.id = 'portal-whiteout-overlay'
        overlay.style.position = 'fixed'
        overlay.style.inset = '0'
        overlay.style.background = '#ffffff'
        overlay.style.opacity = '0'
        overlay.style.pointerEvents = 'none'
        overlay.style.zIndex = '2147483647'
        overlay.style.transition = 'none'
        document.body.appendChild(overlay)
        this.portalWhiteOverlay = overlay
    }

    ensureLookHintOverlay()
    {
        if(this.lookHintOverlay)
            return

        if(!document.getElementById('portal-look-hint-spectral-font'))
        {
            const fontLink = document.createElement('link')
            fontLink.id = 'portal-look-hint-spectral-font'
            fontLink.rel = 'stylesheet'
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600&display=swap'
            document.head.appendChild(fontLink)
        }

        const hint = document.createElement('div')
        hint.id = 'look-drag-hint-overlay'
        hint.textContent = 'Click and drag to look around\nClick door to enter Collabs'
        hint.style.position = 'fixed'
        hint.style.top = '6vh'
        hint.style.left = '4vw'
        hint.style.padding = '0'
        hint.style.borderRadius = '0'
        hint.style.background = 'transparent'
        hint.style.backdropFilter = 'none'
        hint.style.color = '#ffffff'
        hint.style.fontFamily = '"Spectral", Georgia, serif'
        hint.style.fontSize = '14px'
        hint.style.lineHeight = '1.5'
        hint.style.letterSpacing = '0.06em'
        hint.style.opacity = '0.85'
        hint.style.textShadow = '0 2px 10px rgba(0,0,0,0.25)'
        hint.style.fontWeight = '500'
        hint.style.whiteSpace = 'pre-line'
        hint.style.pointerEvents = 'none'
        hint.style.zIndex = '2147483646'
        hint.style.transition = 'opacity 140ms ease'
        document.body.appendChild(hint)
        this.lookHintOverlay = hint
    }

    updateLookHintVisibility()
    {
        if(!this.lookHintOverlay)
            return

        const pointerDown = !!this.state?.controls?.pointer?.down
        const hideHint = pointerDown || this.portalSequenceActive || this.doorOpening || this.doorOpened
        this.lookHintOverlay.style.opacity = hideHint ? '0' : '1'
    }

    resetPortalSequenceState()
    {
        this.portalPhase = 'idle'
        this.portalPhaseStartTime = 0
        this.portalSequenceActive = false
        this.portalPullStart = null
        this.portalPullTargetBase = null
        this.portalPullTarget = null
        this.portalWhiteoutStartOpacity = 0
        this.portalCameraDistanceStart = null
        this.portalCameraAboveStart = null
        this.portalDoorFrozenGroupPosition = null
        this.portalMovementDisabledLogged = false
        this.portalRecenterStart = null
        this.portalRecenterTarget = null
        this.portalRecenterCameraThetaStart = null
        this.portalRecenterCameraThetaTarget = null
        this.portalRecenterCameraPhiStart = null
        this.portalRecenterCameraPhiTarget = null
        this.portalRecenterCameraDistanceStart = null
        this.portalRecenterCameraDistanceTarget = null
        this.portalRecenterCameraAboveStart = null
        this.portalRecenterCameraAboveTarget = null
        this.lastPortalPositionLogTime = -Infinity

        if(this.portalWhiteOverlay)
            this.portalWhiteOverlay.style.opacity = '0'
        this.setPortalRenderHidden(false)
    }

    removePortalFill()
    {
        if(this.portalFillMesh?.parent)
            this.portalFillMesh.parent.remove(this.portalFillMesh)
        if(this.portalFillLight?.parent)
            this.portalFillLight.parent.remove(this.portalFillLight)

        this.portalFillMesh = null
        this.portalFillMaterial = null
        this.portalFillLight = null
    }

    setPortalRenderHidden(hidden)
    {
        const opacity = hidden ? '0' : '1'
        const canvas = this.view?.renderer?.instance?.domElement
        if(canvas)
            canvas.style.opacity = opacity
        const gameRoot = document.querySelector('.game')
        if(gameRoot)
            gameRoot.style.opacity = opacity
    }

    applyTopWhiteOverlay(opacity = '1')
    {
        try
        {
            const topWindow = window.top
            if(!topWindow || topWindow === window)
                return

            const topDoc = topWindow.document
            topDoc.body.style.background = '#ffffff'
            topDoc.documentElement.style.background = '#ffffff'
            let topOverlay = topDoc.getElementById('portal-whiteout-overlay-top')
            if(!topOverlay)
            {
                topOverlay = topDoc.createElement('div')
                topOverlay.id = 'portal-whiteout-overlay-top'
                topOverlay.style.position = 'fixed'
                topOverlay.style.inset = '0'
                topOverlay.style.background = '#ffffff'
                topOverlay.style.opacity = '0'
                topOverlay.style.pointerEvents = 'none'
                topOverlay.style.zIndex = '2147483647'
                topOverlay.style.transition = 'none'
                topDoc.body.appendChild(topOverlay)
            }
            topOverlay.style.opacity = opacity
        }
        catch(error)
        {
            console.warn('Unable to apply top-window white overlay', error)
        }
    }

    forcePortalFullWhiteLock()
    {
        this.updatePortalFillVisuals(1)
        if(this.portalWhiteOverlay)
            this.portalWhiteOverlay.style.opacity = '1'
        this.setPortalRenderHidden(true)
        document.body.style.background = '#ffffff'
        document.documentElement.style.background = '#ffffff'
        this.applyTopWhiteOverlay('1')
    }

    getPortalOpeningLocalBounds()
    {
        const frameOpening = this.hingeDebugInfo?.frameOpeningBoundsLocal
        if(frameOpening?.min && frameOpening?.max)
            return frameOpening

        if(this.doorLocalBounds?.min && this.doorLocalBounds?.max)
            return this.doorLocalBounds

        return null
    }

    getPortalOpeningCenterWorld()
    {
        const openingBounds = this.getPortalOpeningLocalBounds()
        if(!this.doorModelRoot || !openingBounds)
            return null

        const openingCenterLocal = new THREE.Vector3(
            (openingBounds.min.x + openingBounds.max.x) * 0.5,
            (openingBounds.min.y + openingBounds.max.y) * 0.5,
            (openingBounds.min.z + openingBounds.max.z) * 0.5
        )

        return this.doorModelRoot.localToWorld(openingCenterLocal)
    }

    createPortalFillInsideFrame()
    {
        if(!this.doorModelRoot || !this.doorSlabNode)
            return false

        this.removePortalFill()

        const openingBounds = this.getPortalOpeningLocalBounds()
        if(!openingBounds)
            return false

        const slabBounds = this.doorLocalBounds || this.getLocalBoundsForObject(this.doorSlabNode, this.doorModelRoot)
        if(!slabBounds)
            return false

        const slabWidth = Math.max(0.2, slabBounds.max.x - slabBounds.min.x)
        const slabHeight = Math.max(0.2, slabBounds.max.y - slabBounds.min.y)
        const openingDepth = Math.max(0.08, openingBounds.max.z - openingBounds.min.z)
        const fillWidth = slabWidth * PORTAL_FILL_SLAB_MATCH_RATIO
        const fillHeight = slabHeight * PORTAL_FILL_SLAB_MATCH_RATIO
        const openingCenterLocal = new THREE.Vector3(
            (openingBounds.min.x + openingBounds.max.x) * 0.5,
            (openingBounds.min.y + openingBounds.max.y) * 0.5,
            (openingBounds.min.z + openingBounds.max.z) * 0.5
        )

        const camera = this.view?.camera?.instance
        const cameraDoorLocal = camera
            ? this.doorModelRoot.worldToLocal(camera.position.clone())
            : new THREE.Vector3(openingCenterLocal.x, openingCenterLocal.y, openingBounds.max.z + 1)
        const viewerOnPositiveZ = cameraDoorLocal.z >= openingCenterLocal.z
        const behindZ = viewerOnPositiveZ
            ? openingBounds.min.z + PORTAL_FILL_DEPTH_OFFSET
            : openingBounds.max.z - PORTAL_FILL_DEPTH_OFFSET
        const fillCenterDoorLocal = new THREE.Vector3(openingCenterLocal.x, openingCenterLocal.y, behindZ)

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(fillWidth, fillHeight),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0,
                roughness: 0.1,
                metalness: 0.0,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false,
                toneMapped: false
            })
        )
        plane.name = 'Door_PortalFill'
        plane.position.copy(fillCenterDoorLocal)
        plane.rotation.set(0, 0, 0)
        if(viewerOnPositiveZ)
            plane.rotation.y = Math.PI
        plane.renderOrder = 50

        const fillLight = new THREE.PointLight(0xffffff, 0, Math.max(8, fillWidth * 8))
        fillLight.position.copy(plane.position)

        this.doorModelRoot.add(plane)
        this.doorModelRoot.add(fillLight)
        this.portalFillMesh = plane
        this.portalFillMaterial = plane.material
        this.portalFillLight = fillLight

        console.log('[portal] white portal surface created successfully:', true)
        console.log('[portal] fill-fit dimensions:', {
            slabWidth: Number(slabWidth.toFixed(4)),
            slabHeight: Number(slabHeight.toFixed(4)),
            openingDepth: Number(openingDepth.toFixed(4)),
            fillWidth: Number(fillWidth.toFixed(4)),
            fillHeight: Number(fillHeight.toFixed(4)),
            fillZ: Number(fillCenterDoorLocal.z.toFixed(4)),
            viewerOnPositiveZ
        })
        return true
    }

    ensurePortalFillReady()
    {
        if(this.portalFillMesh && this.portalFillMaterial && this.portalFillMesh.parent)
            return true

        return this.createPortalFillInsideFrame()
    }

    updatePortalFillVisuals(rawProgress)
    {
        if(!this.portalFillMaterial)
            return

        const clamped = THREE.MathUtils.clamp(rawProgress, 0, 1)
        const eased = 1 - Math.pow(1 - clamped, 3)
        this.portalFillMaterial.opacity = PORTAL_FILL_OPACITY_MAX * eased
        this.portalFillMaterial.emissiveIntensity = PORTAL_FILL_EMISSIVE_MAX * eased

        if(this.portalFillLight)
            this.portalFillLight.intensity = PORTAL_LIGHT_INTENSITY_MAX * eased
    }

    getThirdPersonCameraStates()
    {
        const states = []
        const cameraThirdPerson = this.state?.camera?.thirdPerson
        const playerThirdPerson = this.state?.player?.camera?.thirdPerson
        if(cameraThirdPerson)
            states.push(cameraThirdPerson)
        if(playerThirdPerson && playerThirdPerson !== cameraThirdPerson)
            states.push(playerThirdPerson)
        return states
    }

    getPrimaryThirdPersonCameraState()
    {
        const states = this.getThirdPersonCameraStates()
        return states.length > 0 ? states[0] : null
    }

    capturePortalEntryPoseOnce()
    {
        if(this.portalEntryPoseCaptured)
            return

        const playerWorld = this.getPlayerWorldPosition()
        const thirdPerson = this.getPrimaryThirdPersonCameraState()
        if(!playerWorld || !thirdPerson)
            return

        this.portalEntryPlayerWorld = playerWorld.clone()
        this.portalEntryCameraTheta = thirdPerson.theta
        this.portalEntryCameraPhi = thirdPerson.phi
        this.portalEntryCameraDistance = thirdPerson.distance
        this.portalEntryCameraAbove = thirdPerson.aboveOffset
        this.portalEntryPoseCaptured = true
    }

    shortestAngleDelta(from, to)
    {
        let delta = to - from
        while(delta > Math.PI)
            delta -= Math.PI * 2
        while(delta < -Math.PI)
            delta += Math.PI * 2
        return delta
    }

    lerpAngle(from, to, t)
    {
        return from + this.shortestAngleDelta(from, to) * t
    }

    refreshPortalPullCameraStarts()
    {
        const thirdPerson = this.getPrimaryThirdPersonCameraState()
        this.portalCameraDistanceStart = thirdPerson ? thirdPerson.distance : null
        this.portalCameraAboveStart = thirdPerson ? thirdPerson.aboveOffset : null
    }

    computePortalPullTargetFromStart(startWorld)
    {
        const baseTarget = this.portalPullTargetBase ? this.portalPullTargetBase.clone() : null
        if(!baseTarget || !startWorld)
            return baseTarget || startWorld || null

        const pullDirection = baseTarget.clone().sub(startWorld)
        const pullLength = pullDirection.length()
        if(pullLength > 0.0001)
            pullDirection.divideScalar(pullLength)
        else
            pullDirection.set(0, 0, -1)

        const openingBounds = this.getPortalOpeningLocalBounds()
        const openingDepth = openingBounds
            ? Math.max(0.12, openingBounds.max.z - openingBounds.min.z)
            : 0.2
        const extraDepth = Math.max(PORTAL_PULL_EXTRA_DEPTH, openingDepth * 16.0)
        const finalTarget = baseTarget.clone().addScaledVector(pullDirection, extraDepth)
        finalTarget.y = startWorld.y
        return finalTarget
    }

    shouldRecenterToEntryPose(playerWorld)
    {
        if(!this.portalEntryPoseCaptured || !this.portalEntryPlayerWorld || !playerWorld)
            return false

        const thirdPerson = this.getPrimaryThirdPersonCameraState()
        const positionDelta = playerWorld.distanceTo(this.portalEntryPlayerWorld)
        const thetaDelta = thirdPerson && this.portalEntryCameraTheta !== null
            ? Math.abs(this.shortestAngleDelta(thirdPerson.theta, this.portalEntryCameraTheta))
            : 0
        const phiDelta = thirdPerson && this.portalEntryCameraPhi !== null
            ? Math.abs(this.shortestAngleDelta(thirdPerson.phi, this.portalEntryCameraPhi))
            : 0

        return (
            positionDelta > PORTAL_RECENTER_POSITION_EPSILON ||
            thetaDelta > PORTAL_RECENTER_ANGLE_EPSILON ||
            phiDelta > PORTAL_RECENTER_ANGLE_EPSILON
        )
    }

    beginPortalPullPhase(startWorld)
    {
        if(!startWorld)
            return

        this.portalPullStart = startWorld.clone()
        this.portalPullTarget = this.computePortalPullTargetFromStart(this.portalPullStart)
        this.portalPhase = 'pull'
        this.portalPhaseStartTime = this.state.time.elapsed
        this.refreshPortalPullCameraStarts()
    }

    startPortalSequence()
    {
        if(this.portalSequenceActive || !this.doorModelRoot || !this.doorSlabNode)
            return

        const created = this.ensurePortalFillReady()
        const targetWorld = this.getPortalOpeningCenterWorld()
        const playerWorld = this.getPlayerWorldPosition()
        if(!targetWorld || !playerWorld)
            return

        this.portalSequenceActive = true
        this.portalPullStart = null
        this.portalPullTarget = null
        this.portalPullTargetBase = targetWorld.clone()
        if(this.doorModelRoot)
        {
            const doorRightWorld = new THREE.Vector3(1, 0, 0)
            doorRightWorld.applyQuaternion(this.doorModelRoot.getWorldQuaternion(new THREE.Quaternion())).normalize()
            this.portalPullTargetBase.addScaledVector(doorRightWorld, PORTAL_PULL_RIGHT_BIAS)
        }
        this.portalDoorFrozenGroupPosition = this.group.position.clone()
        const shouldRecenter = this.shouldRecenterToEntryPose(playerWorld)
        const thirdPerson = this.getPrimaryThirdPersonCameraState()
        if(shouldRecenter && this.portalEntryPlayerWorld)
        {
            this.portalPhase = 'recenter'
            this.portalPhaseStartTime = this.state.time.elapsed
            this.portalRecenterStart = playerWorld.clone()
            this.portalRecenterTarget = this.portalEntryPlayerWorld.clone()
            // Keep vertical level unchanged while recentering to avoid a floor drop.
            this.portalRecenterTarget.y = this.portalRecenterStart.y
            this.portalRecenterCameraThetaStart = thirdPerson?.theta ?? null
            this.portalRecenterCameraThetaTarget = this.portalEntryCameraTheta
            this.portalRecenterCameraPhiStart = thirdPerson?.phi ?? null
            this.portalRecenterCameraPhiTarget = this.portalEntryCameraPhi
            this.portalRecenterCameraDistanceStart = thirdPerson?.distance ?? null
            this.portalRecenterCameraDistanceTarget = thirdPerson?.distance ?? null
            this.portalRecenterCameraAboveStart = thirdPerson?.aboveOffset ?? null
            this.portalRecenterCameraAboveTarget = thirdPerson?.aboveOffset ?? null
        }
        else
        {
            this.beginPortalPullPhase(playerWorld)
        }
        this.lastPortalPositionLogTime = -Infinity
        this.doorNavigateTriggered = false
        this.disableMovementInputForPortal()

        console.groupCollapsed('[portal] pull-in sequence started')
        console.log('white portal surface created successfully:', created)
        console.log('doorway target position:', this.vectorToFixed(this.portalPullTargetBase))
        console.log('player start position:', this.vectorToFixed(playerWorld))
        console.log('entry pose position:', this.vectorToFixed(this.portalEntryPlayerWorld))
        console.log('portal extra depth:', PORTAL_PULL_EXTRA_DEPTH)
        console.log('portal recenter first:', shouldRecenter)
        console.log('movement input disabled:', true)
        console.groupEnd()
    }

    easeInCubic(t)
    {
        return t * t * t
    }

    easeInQuint(t)
    {
        return t * t * t * t * t
    }

    easeInExpo(t)
    {
        if(t <= 0)
            return 0
        return Math.pow(2, 10 * t - 10)
    }

    updatePortalSequence()
    {
        if(!this.portalSequenceActive)
            return

        this.disableMovementInputForPortal()

        if(this.portalPhase === 'recenter')
        {
            const elapsed = this.state.time.elapsed - this.portalPhaseStartTime
            const progress = THREE.MathUtils.clamp(elapsed / PORTAL_RECENTER_DURATION, 0, 1)
            const eased = this.easeInOutCubic(progress)
            const recenterStart = this.portalRecenterStart || this.getPlayerWorldPosition() || new THREE.Vector3()
            const recenterTarget = this.portalRecenterTarget || recenterStart
            const current = recenterStart.clone().lerp(recenterTarget, eased)
            this.setPlayerWorldPosition(current)

            const thirdPersonStates = this.getThirdPersonCameraStates()
            if(thirdPersonStates.length > 0)
            {
                for(const thirdPerson of thirdPersonStates)
                {
                    if(this.portalRecenterCameraThetaStart !== null && this.portalRecenterCameraThetaTarget !== null)
                    {
                        thirdPerson.theta = this.lerpAngle(
                            this.portalRecenterCameraThetaStart,
                            this.portalRecenterCameraThetaTarget,
                            eased
                        )
                    }

                    if(this.portalRecenterCameraPhiStart !== null && this.portalRecenterCameraPhiTarget !== null)
                    {
                        thirdPerson.phi = this.lerpAngle(
                            this.portalRecenterCameraPhiStart,
                            this.portalRecenterCameraPhiTarget,
                            eased
                        )
                    }

                    if(this.portalRecenterCameraDistanceStart !== null && this.portalRecenterCameraDistanceTarget !== null)
                    {
                        thirdPerson.distance = THREE.MathUtils.lerp(
                            this.portalRecenterCameraDistanceStart,
                            this.portalRecenterCameraDistanceTarget,
                            eased
                        )
                    }

                    if(this.portalRecenterCameraAboveStart !== null && this.portalRecenterCameraAboveTarget !== null)
                    {
                        thirdPerson.aboveOffset = THREE.MathUtils.lerp(
                            this.portalRecenterCameraAboveStart,
                            this.portalRecenterCameraAboveTarget,
                            eased
                        )
                    }
                }
            }

            this.updatePortalFillVisuals(0.42 + eased * 0.18)

            if(progress >= 1)
            {
                this.portalRecenterStart = null
                this.portalRecenterTarget = null
                this.beginPortalPullPhase(recenterTarget)
            }
        }
        else if(this.portalPhase === 'pull')
        {
            const elapsed = this.state.time.elapsed - this.portalPhaseStartTime
            const progress = THREE.MathUtils.clamp(elapsed / PORTAL_PULL_DURATION, 0, 1)
            const eased = this.easeInCubic(progress)
            const start = this.portalPullStart || this.getPlayerWorldPosition() || new THREE.Vector3()
            const target = this.portalPullTarget || start
            const current = start.clone().lerp(target, eased)
            this.setPlayerWorldPosition(current)
            this.updatePortalFillVisuals(0.6 + eased * 0.4)
            const thirdPerson = this.state?.camera?.thirdPerson
            if(thirdPerson && this.portalCameraDistanceStart !== null && this.portalCameraAboveStart !== null)
            {
                const cameraEase = this.easeInExpo(progress)
                thirdPerson.distance = THREE.MathUtils.lerp(
                    this.portalCameraDistanceStart,
                    PORTAL_CAMERA_DISTANCE_END,
                    cameraEase
                )
                thirdPerson.aboveOffset = THREE.MathUtils.lerp(
                    this.portalCameraAboveStart,
                    PORTAL_CAMERA_ABOVE_END,
                    cameraEase
                )
            }

            const whiteoutProgress = THREE.MathUtils.clamp(
                (progress - PORTAL_WHITEOUT_START_PROGRESS) / (1 - PORTAL_WHITEOUT_START_PROGRESS),
                0,
                1
            )
            if(this.portalWhiteOverlay)
            {
                const whiteOpacity = Math.min(1, this.easeInCubic(whiteoutProgress) * 1.35)
                this.portalWhiteOverlay.style.opacity = `${whiteOpacity}`
            }
            if(progress >= PORTAL_HARD_WHITE_LOCK_PROGRESS)
                this.forcePortalFullWhiteLock()

            if(this.state.time.elapsed - this.lastPortalPositionLogTime > PORTAL_LOG_INTERVAL_SECONDS)
            {
                this.lastPortalPositionLogTime = this.state.time.elapsed
                console.log('[portal] player current position during pull:', this.vectorToFixed(current))
            }

            if(progress >= 1)
            {
                this.forcePortalFullWhiteLock()
                this.portalWhiteoutStartOpacity = 1
                this.portalPhase = 'whiteout'
                this.portalPhaseStartTime = this.state.time.elapsed
            }
        }
        else if(this.portalPhase === 'whiteout')
        {
            const holdElapsed = this.state.time.elapsed - this.portalPhaseStartTime
            const holdProgress = THREE.MathUtils.clamp(holdElapsed / PORTAL_WHITEOUT_HOLD_DURATION, 0, 1)
            this.forcePortalFullWhiteLock()

            if(holdProgress >= 1 && !this.doorNavigateTriggered)
            {
                this.doorNavigateTriggered = true
                this.navigateToReels()
            }
        }
    }

    disableMovementInputForPortal()
    {
        const controls = this.state?.controls
        if(!controls)
            return

        const down = controls.keys?.down
        if(down)
        {
            down.forward = false
            down.backward = false
            down.strafeLeft = false
            down.strafeRight = false
            down.boost = false
            down.jump = false
            down.crouch = false
        }

        if(controls.pointer)
        {
            controls.pointer.down = false
            controls.pointer.delta.x = 0
            controls.pointer.delta.y = 0
            controls.pointer.deltaTemp.x = 0
            controls.pointer.deltaTemp.y = 0
        }

        if(this.state.viewport?.pointerLock?.active)
            this.state.viewport.pointerLock.deactivate()

        if(!this.portalMovementDisabledLogged)
        {
            this.portalMovementDisabledLogged = true
            console.log('[portal] movement input disabled:', true)
        }
    }

    getPlayerWorldPosition()
    {
        const playerState = this.state.player
        if(!playerState?.position?.current)
            return null

        return new THREE.Vector3(
            playerState.position.current[0],
            playerState.position.current[1],
            playerState.position.current[2]
        )
    }

    setPlayerWorldPosition(position)
    {
        const playerState = this.state.player
        if(!playerState?.position?.current || !position)
            return

        playerState.position.current[0] = position.x
        playerState.position.current[1] = position.y
        playerState.position.current[2] = position.z
        if(playerState.position.previous)
        {
            playerState.position.previous[0] = position.x
            playerState.position.previous[1] = position.y
            playerState.position.previous[2] = position.z
        }
    }

    handlePointerDownCapture(event)
    {
        try
        {
            if(window.parent && window.parent !== window)
            {
                window.parent.postMessage({
                    source: 'collabs-portal',
                    type: 'user-gesture'
                }, window.location.origin)
            }
        }
        catch(error)
        {
            console.warn('[portal] unable to post user-gesture message to parent', error)
        }

        if(!this.doorSlabNode || !this.doorHingePivot || this.doorOpening || this.doorOpened || this.portalSequenceActive)
            return

        const camera = this.view?.camera?.instance
        const canvas = this.view?.renderer?.instance?.domElement
        if(!camera || !canvas)
            return

        const rect = canvas.getBoundingClientRect()
        if(rect.width <= 0 || rect.height <= 0)
            return

        this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.pointerNdc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
        this.raycaster.setFromCamera(this.pointerNdc, camera)

        const hits = this.raycaster.intersectObject(this.doorSlabNode, true)
        if(hits.length === 0)
            return

        if(event.cancelable)
            event.preventDefault()
        event.stopPropagation()
        if(typeof event.stopImmediatePropagation === 'function')
            event.stopImmediatePropagation()

        this.startDoorOpen()
    }

    setupDoorHingePivot(doorRoot, doorSlab)
    {
        if(!doorRoot || !doorSlab)
            return

        const slabBoundsBefore = this.getLocalBoundsForObject(doorSlab, doorRoot)
        if(!slabBoundsBefore)
            return

        const frameBounds = this.doorFrameNode
            ? this.getLocalBoundsForObject(this.doorFrameNode, doorRoot)
            : null
        const hingeEdgeBefore = this.getDoorHingeEdgeData(doorSlab, doorRoot, slabBoundsBefore)
        const frameOpeningBounds = this.getFrameOpeningBounds(this.doorFrameNode, doorRoot, slabBoundsBefore, frameBounds)
        const rightJambData = this.getRightJambData(this.doorFrameNode, doorRoot, slabBoundsBefore, frameBounds)
        const hingeTargetLocal = hingeEdgeBefore.referencePoint.clone()
        hingeTargetLocal.x += HINGE_NUDGE_X

        doorRoot.updateWorldMatrix(true, true)
        const doorWorldBeforeReparent = doorSlab.getWorldPosition(new THREE.Vector3())

        if(this.doorHingePivot?.parent)
            this.doorHingePivot.parent.remove(this.doorHingePivot)

        const hingePivot = new THREE.Group()
        hingePivot.name = 'Door_HingePivot'
        hingePivot.position.copy(hingeTargetLocal)
        doorRoot.add(hingePivot)
        hingePivot.attach(doorSlab)

        doorRoot.updateWorldMatrix(true, true)
        const doorWorldAfterReparent = doorSlab.getWorldPosition(new THREE.Vector3())

        const slabBoundsAfter = this.getLocalBoundsForObject(doorSlab, doorRoot)
        const hingeEdgeAfter = this.getDoorHingeEdgeData(doorSlab, doorRoot, slabBoundsAfter || slabBoundsBefore)
        const closedGapToJamb = rightJambData
            ? Math.abs(hingeEdgeAfter.referencePoint.x - rightJambData.innerX)
            : null

        this.doorHingePivot = hingePivot
        this.doorLocalBounds = slabBoundsAfter || slabBoundsBefore
        this.doorOpening = false
        this.doorOpened = false
        this.doorNavigateTriggered = false

        this.hingeDebugInfo = {
            rightJambGapClosed: closedGapToJamb,
            pivotWorld: hingePivot.getWorldPosition(new THREE.Vector3()),
            doorWorldBeforeReparent,
            doorWorldAfterReparent,
            doorBoundsLocal: this.doorLocalBounds,
            frameBoundsLocal: frameBounds,
            frameOpeningBoundsLocal: frameOpeningBounds,
            hingeTargetLocal,
            hingeEdgeBeforeLocal: hingeEdgeBefore.referencePoint,
            hingeEdgeAfterLocal: hingeEdgeAfter.referencePoint,
        }
    }

    getLocalBoundsForObject(object3d, localRoot)
    {
        if(!object3d || !localRoot)
            return null

        object3d.updateWorldMatrix(true, true)
        localRoot.updateWorldMatrix(true, true)

        const worldBox = new THREE.Box3().setFromObject(object3d)
        if(worldBox.isEmpty())
            return null

        const corners = [
            new THREE.Vector3(worldBox.min.x, worldBox.min.y, worldBox.min.z),
            new THREE.Vector3(worldBox.min.x, worldBox.min.y, worldBox.max.z),
            new THREE.Vector3(worldBox.min.x, worldBox.max.y, worldBox.min.z),
            new THREE.Vector3(worldBox.min.x, worldBox.max.y, worldBox.max.z),
            new THREE.Vector3(worldBox.max.x, worldBox.min.y, worldBox.min.z),
            new THREE.Vector3(worldBox.max.x, worldBox.min.y, worldBox.max.z),
            new THREE.Vector3(worldBox.max.x, worldBox.max.y, worldBox.min.z),
            new THREE.Vector3(worldBox.max.x, worldBox.max.y, worldBox.max.z),
        ]

        const min = new THREE.Vector3(Infinity, Infinity, Infinity)
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

        for(const worldCorner of corners)
        {
            const localCorner = localRoot.worldToLocal(worldCorner.clone())
            min.min(localCorner)
            max.max(localCorner)
        }

        return { min, max }
    }

    collectLocalVerticesForObject(object3d, localRoot)
    {
        if(!object3d || !localRoot)
            return []

        object3d.updateWorldMatrix(true, true)
        localRoot.updateWorldMatrix(true, true)

        const rootInverse = localRoot.matrixWorld.clone().invert()
        const worldVertex = new THREE.Vector3()
        const localVertex = new THREE.Vector3()
        const vertices = []

        object3d.traverse((node) =>
        {
            if(!node.isMesh || !node.geometry?.attributes?.position)
                return

            const positions = node.geometry.attributes.position
            for(let i = 0; i < positions.count; i++)
            {
                worldVertex.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld)
                localVertex.copy(worldVertex).applyMatrix4(rootInverse)
                vertices.push(localVertex.clone())
            }
        })

        return vertices
    }

    convertPointBetweenLocalSpaces(point, fromLocalRoot, toLocalRoot)
    {
        const worldPoint = fromLocalRoot.localToWorld(point.clone())
        return toLocalRoot.worldToLocal(worldPoint)
    }

    getMedian(values)
    {
        if(!values || values.length === 0)
            return 0

        const sorted = values.slice().sort((a, b) => a - b)
        const mid = Math.floor(sorted.length * 0.5)
        if(sorted.length % 2 === 0)
            return (sorted[mid - 1] + sorted[mid]) * 0.5
        return sorted[mid]
    }

    getDoorHingeEdgeData(doorSlab, doorRoot, slabBounds)
    {
        const fallbackPoint = new THREE.Vector3(
            slabBounds.max.x,
            (slabBounds.min.y + slabBounds.max.y) * 0.5,
            (slabBounds.min.z + slabBounds.max.z) * 0.5
        )

        const vertices = this.collectLocalVerticesForObject(doorSlab, doorRoot)
        if(vertices.length === 0)
            return { referencePoint: fallbackPoint, points: [fallbackPoint.clone()] }

        const slabWidth = Math.max(0.0001, slabBounds.max.x - slabBounds.min.x)
        const threshold = slabBounds.max.x - Math.max(0.001, slabWidth * 0.02)
        let rightEdgePoints = vertices.filter((vertex) => vertex.x >= threshold)

        if(rightEdgePoints.length === 0)
        {
            const maxX = Math.max(...vertices.map((vertex) => vertex.x))
            rightEdgePoints = vertices.filter((vertex) => vertex.x >= maxX - 0.001)
        }

        if(rightEdgePoints.length === 0)
            return { referencePoint: fallbackPoint, points: [fallbackPoint.clone()] }

        const maxX = Math.max(...rightEdgePoints.map((vertex) => vertex.x))
        const yMid = this.getMedian(rightEdgePoints.map((vertex) => vertex.y))
        const zMid = this.getMedian(rightEdgePoints.map((vertex) => vertex.z))
        const referencePoint = new THREE.Vector3(maxX, yMid, zMid)

        return { referencePoint, points: rightEdgePoints.map((point) => point.clone()) }
    }

    getRightJambData(doorFrame, doorRoot, slabBounds, frameBounds)
    {
        if(!doorFrame)
            return null

        const frameVertices = this.collectLocalVerticesForObject(doorFrame, doorRoot)
        if(frameVertices.length === 0)
        {
            if(!frameBounds)
                return null
            return {
                innerX: frameBounds.max.x,
                sampleZ: (slabBounds.min.z + slabBounds.max.z) * 0.5,
                points: [new THREE.Vector3(frameBounds.max.x, (slabBounds.min.y + slabBounds.max.y) * 0.5, (slabBounds.min.z + slabBounds.max.z) * 0.5)]
            }
        }

        const slabWidth = slabBounds.max.x - slabBounds.min.x
        const slabHeight = slabBounds.max.y - slabBounds.min.y
        const slabDepth = slabBounds.max.z - slabBounds.min.z
        const slabCenterZ = (slabBounds.min.z + slabBounds.max.z) * 0.5
        const yPadding = Math.max(0.02, slabHeight * 0.08)
        const zBand = Math.max(0.05, slabDepth * 1.6)
        const xFloor = slabBounds.max.x - Math.max(0.05, slabWidth * 0.2)

        let candidates = frameVertices.filter((vertex) =>
            vertex.x >= xFloor &&
            vertex.y >= slabBounds.min.y - yPadding &&
            vertex.y <= slabBounds.max.y + yPadding &&
            Math.abs(vertex.z - slabCenterZ) <= zBand
        )

        if(candidates.length === 0)
        {
            candidates = frameVertices.filter((vertex) =>
                vertex.x >= xFloor &&
                vertex.y >= slabBounds.min.y - yPadding &&
                vertex.y <= slabBounds.max.y + yPadding
            )
        }

        if(candidates.length === 0)
        {
            candidates = frameVertices.filter((vertex) => vertex.x >= slabBounds.max.x - 0.01)
        }

        if(candidates.length === 0)
            return null

        const innerX = Math.min(...candidates.map((point) => point.x))
        const sampleZ = this.getMedian(candidates.map((point) => point.z))
        return {
            innerX,
            sampleZ,
            points: candidates.map((point) => point.clone())
        }
    }

    getFrameOpeningBounds(doorFrame, doorRoot, slabBounds, frameBounds)
    {
        if(!doorFrame)
            return frameBounds

        const frameVertices = this.collectLocalVerticesForObject(doorFrame, doorRoot)
        if(frameVertices.length === 0)
            return frameBounds

        const slabWidth = slabBounds.max.x - slabBounds.min.x
        const slabHeight = slabBounds.max.y - slabBounds.min.y
        const slabDepth = slabBounds.max.z - slabBounds.min.z
        const slabCenterZ = (slabBounds.min.z + slabBounds.max.z) * 0.5
        const yPadding = Math.max(0.02, slabHeight * 0.1)
        const zBand = Math.max(0.05, slabDepth * 1.6)

        const lateralBand = frameVertices.filter((vertex) =>
            vertex.y >= slabBounds.min.y - yPadding &&
            vertex.y <= slabBounds.max.y + yPadding &&
            Math.abs(vertex.z - slabCenterZ) <= zBand
        )

        const leftBand = lateralBand.filter((vertex) => vertex.x <= slabBounds.min.x + slabWidth * 0.4)
        const rightBand = lateralBand.filter((vertex) => vertex.x >= slabBounds.max.x - slabWidth * 0.4)
        const leftInnerX = leftBand.length > 0 ? Math.max(...leftBand.map((vertex) => vertex.x)) : slabBounds.min.x
        const rightInnerX = rightBand.length > 0 ? Math.min(...rightBand.map((vertex) => vertex.x)) : slabBounds.max.x

        const verticalBand = frameVertices.filter((vertex) =>
            vertex.x >= leftInnerX - 0.05 &&
            vertex.x <= rightInnerX + 0.05 &&
            Math.abs(vertex.z - slabCenterZ) <= zBand
        )

        const bottomBand = verticalBand.filter((vertex) => vertex.y <= slabBounds.min.y + slabHeight * 0.35)
        const topBand = verticalBand.filter((vertex) => vertex.y >= slabBounds.max.y - slabHeight * 0.35)
        const bottomInnerY = bottomBand.length > 0 ? Math.max(...bottomBand.map((vertex) => vertex.y)) : slabBounds.min.y
        const topInnerY = topBand.length > 0 ? Math.min(...topBand.map((vertex) => vertex.y)) : slabBounds.max.y

        return {
            min: new THREE.Vector3(leftInnerX, bottomInnerY, slabBounds.min.z),
            max: new THREE.Vector3(rightInnerX, topInnerY, slabBounds.max.z)
        }
    }

    getClosestPointPair(pointsA, pointsB)
    {
        if(!pointsA?.length || !pointsB?.length)
            return null

        let bestDistanceSq = Infinity
        let bestA = null
        let bestB = null
        const stepA = Math.max(1, Math.floor(pointsA.length / HINGE_MATCH_SAMPLE_COUNT))
        const stepB = Math.max(1, Math.floor(pointsB.length / HINGE_MATCH_SAMPLE_COUNT))

        for(let i = 0; i < pointsA.length; i += stepA)
        {
            const pointA = pointsA[i]
            for(let j = 0; j < pointsB.length; j += stepB)
            {
                const pointB = pointsB[j]
                const dx = pointA.x - pointB.x
                const dy = (pointA.y - pointB.y) * 0.15
                const dz = pointA.z - pointB.z
                const distanceSq = dx * dx + dy * dy + dz * dz
                if(distanceSq < bestDistanceSq)
                {
                    bestDistanceSq = distanceSq
                    bestA = pointA
                    bestB = pointB
                }
            }
        }

        if(!bestA || !bestB)
            return null

        return {
            a: bestA.clone(),
            b: bestB.clone(),
            distance: Math.sqrt(bestDistanceSq)
        }
    }

    startDoorOpen()
    {
        const camera = this.view?.camera?.instance
        if(!this.doorHingePivot || !this.doorLocalBounds || !camera)
            return

        const signInfo = this.getDoorOpenDirectionSignTowardCamera(camera)
        this.doorOpenSign = signInfo.sign
        this.doorOpenTargetRadians = this.doorOpenSign * THREE.MathUtils.degToRad(DOOR_OPEN_DEGREES)
        this.doorOpenStartTime = this.state.time.elapsed
        this.doorOpening = true
        const portalReady = this.ensurePortalFillReady()
        if(portalReady)
            this.updatePortalFillVisuals(0.4)
        // Start pull immediately as door begins opening.
        this.startPortalSequence()

        console.groupCollapsed('[door-hinge] open-start')
        console.log('door node:', this.doorSlabNode?.name || 'NOT_FOUND')
        console.log('door position (local):', this.vectorToFixed(this.doorSlabNode?.position))
        console.log('hinge pivot position (local):', this.vectorToFixed(this.doorHingePivot.position))
        console.log('current local rotation y:', this.doorHingePivot.rotation.y)
        console.log('sign decision toward viewer:', signInfo.reason)
        console.log('white portal surface ready before open:', portalReady)
        console.groupEnd()
    }

    getDoorOpenDirectionSignTowardCamera(camera)
    {
        const bounds = this.doorLocalBounds
        const hinge = this.doorHingePivot.position
        const freeEdgeLocal = new THREE.Vector3(
            bounds.min.x,
            (bounds.min.y + bounds.max.y) * 0.5,
            (bounds.min.z + bounds.max.z) * 0.5
        )
        const cameraWorld = camera.position.clone()
        const plusWorld = this.getRotatedDoorPointWorld(freeEdgeLocal, hinge, DOOR_SIGN_TEST_RADIANS)
        const minusWorld = this.getRotatedDoorPointWorld(freeEdgeLocal, hinge, -DOOR_SIGN_TEST_RADIANS)
        const plusDistance = plusWorld.distanceTo(cameraWorld)
        const minusDistance = minusWorld.distanceTo(cameraWorld)

        if(plusDistance <= minusDistance)
        {
            return {
                sign: 1,
                reason: `positive rotation moved free edge closer (plus=${plusDistance.toFixed(4)}, minus=${minusDistance.toFixed(4)})`
            }
        }

        return {
            sign: -1,
            reason: `negative rotation moved free edge closer (plus=${plusDistance.toFixed(4)}, minus=${minusDistance.toFixed(4)})`
        }
    }

    getRotatedDoorPointWorld(pointLocal, hingeLocal, angleRadians)
    {
        const pointRelative = pointLocal.clone().sub(hingeLocal)
        pointRelative.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRadians)
        const rotatedLocal = hingeLocal.clone().add(pointRelative)
        return this.doorModelRoot.localToWorld(rotatedLocal)
    }

    easeInOutCubic(t)
    {
        if(t < 0.5)
            return 4 * t * t * t
        return 1 - Math.pow(-2 * t + 2, 3) * 0.5
    }

    updateDoorOpening()
    {
        if(!this.doorOpening || !this.doorHingePivot)
            return

        const elapsed = this.state.time.elapsed - this.doorOpenStartTime
        const progress = Math.min(Math.max(elapsed / DOOR_OPEN_DURATION, 0), 1)
        const eased = this.easeInOutCubic(progress)
        this.doorHingePivot.rotation.y = this.doorOpenTargetRadians * eased
        this.updatePortalFillVisuals(0.24 + progress * 0.56)

        if(this.state.time.elapsed - this.lastDoorRotationLogTime > 0.12)
        {
            this.lastDoorRotationLogTime = this.state.time.elapsed
            console.log('[door-hinge] current local rotation y:', this.doorHingePivot.rotation.y.toFixed(4))
        }

        if(progress >= 1)
        {
            this.doorOpening = false
            this.doorOpened = true
            console.log('[door-hinge] open-complete local rotation y:', this.doorHingePivot.rotation.y.toFixed(4))
        }
    }

    navigateToReels()
    {
        this.forcePortalFullWhiteLock()

        let topWindow = null
        try
        {
            topWindow = window.top
            if(topWindow && topWindow !== window)
            {
                this.applyTopWhiteOverlay('1')
            }
        }
        catch(error)
        {
            console.warn('Unable to apply top-window whiteout overlay, using local overlay only', error)
            topWindow = null
        }

        const doNavigate = () =>
        {
            if(topWindow && topWindow !== window)
                topWindow.location.href = DOOR_NAVIGATE_URL
            else
                window.location.href = DOOR_NAVIGATE_URL
        }

        window.setTimeout(doNavigate, PORTAL_NAVIGATE_WHITEOUT_DELAY_MS)
    }

    vectorToFixed(vector)
    {
        if(!vector)
            return 'N/A'
        return {
            x: Number(vector.x.toFixed(4)),
            y: Number(vector.y.toFixed(4)),
            z: Number(vector.z.toFixed(4))
        }
    }

    boundsToFixed(bounds)
    {
        if(!bounds?.min || !bounds?.max)
            return 'N/A'
        return {
            min: this.vectorToFixed(bounds.min),
            max: this.vectorToFixed(bounds.max)
        }
    }

    findDoorNodes(root)
    {
        let doorFrame = null
        let doorSlab = null

        root.traverse((child) =>
        {
            const name = (child.name || '').toLowerCase()
            if(!doorFrame && name.includes(DOOR_FRAME_TOKEN))
                doorFrame = child
            if(!doorSlab && name.includes(DOOR_SLAB_TOKEN))
                doorSlab = child
        })

        return { doorFrame, doorSlab }
    }

    hideNonDoorNodes(root, doorFrame, doorSlab)
    {
        if(!doorFrame || !doorSlab)
            return

        const keep = new Set([root])
        const markAncestors = (object3d) =>
        {
            let current = object3d
            while(current)
            {
                keep.add(current)
                if(current === root)
                    break
                current = current.parent
            }
        }

        markAncestors(doorFrame)
        markAncestors(doorSlab)

        const markSubtree = (object3d) =>
        {
            object3d.traverse((child) => keep.add(child))
        }

        markSubtree(doorFrame)
        markSubtree(doorSlab)

        root.traverse((child) =>
        {
            if(!keep.has(child))
                child.visible = false
        })
    }

    getDoorBounds(doorFrame, doorSlab)
    {
        if(!doorFrame && !doorSlab)
            return null

        const bounds = new THREE.Box3()
        let hasAny = false
        if(doorFrame)
        {
            bounds.expandByObject(doorFrame)
            hasAny = true
        }
        if(doorSlab)
        {
            bounds.expandByObject(doorSlab)
            hasAny = true
        }
        return hasAny ? bounds : null
    }

    setDoorLightRig()
    {
        this.doorHemiLight = new THREE.HemisphereLight('#ffffff', '#4f4a45', DOOR_LIGHT_HEMI_INTENSITY)
        this.doorHemiLight.position.set(0, 2.0, 0)
        this.helper.add(this.doorHemiLight)

        this.doorKeyLight = new THREE.DirectionalLight('#ffffff', DOOR_LIGHT_KEY_INTENSITY)
        this.doorKeyLight.position.set(1.2, 2.4, 1.4)
        this.doorKeyLight.target.position.set(0, 1.1, 0)
        this.helper.add(this.doorKeyLight)
        this.helper.add(this.doorKeyLight.target)
    }

    logDoorDebugInfo(root, doorFrame, doorSlab)
    {
        const lines = []
        const visit = (node, depth) =>
        {
            const indent = '  '.repeat(depth)
            const type = node.type || 'Object3D'
            lines.push(`${indent}${node.name || '(unnamed)'} [${type}] visible=${node.visible}`)
            for(const child of node.children)
            {
                visit(child, depth + 1)
            }
        }
        visit(root, 0)

        const meshRows = []
        root.traverse((node) =>
        {
            if(!node.isMesh)
                return

            const materials = Array.isArray(node.material) ? node.material : [node.material]
            const materialInfo = materials.map((mat) =>
            {
                if(!mat)
                    return 'null-material'
                const mapName = mat.map ? (mat.map.name || '(map)') : 'none'
                const normalName = mat.normalMap ? (mat.normalMap.name || '(normalMap)') : 'none'
                const roughName = mat.roughnessMap ? (mat.roughnessMap.name || '(roughnessMap)') : 'none'
                const metalName = mat.metalnessMap ? (mat.metalnessMap.name || '(metalnessMap)') : 'none'
                return `${mat.name || '(unnamed-material)'} map=${mapName} normal=${normalName} rough=${roughName} metal=${metalName}`
            }).join(' | ')

            meshRows.push(`${node.name || '(unnamed-mesh)'} :: ${materialInfo}`)
        })

        console.groupCollapsed('[door-glb] hierarchy')
        lines.forEach((line) => console.log(line))
        console.groupEnd()

        console.groupCollapsed('[door-glb] meshes/materials/textures')
        meshRows.forEach((line) => console.log(line))
        console.log('doorFrame:', doorFrame ? doorFrame.name : 'NOT_FOUND')
        console.log('doorSlab:', doorSlab ? doorSlab.name : 'NOT_FOUND')
        console.groupEnd()
    }

    logDoorHingeDebug()
    {
        if(!this.doorSlabNode || !this.doorHingePivot)
            return

        console.groupCollapsed('[door-hinge] setup')
        console.log('door node name:', this.doorSlabNode.name || '(unnamed)')
        console.log('door position (local):', this.vectorToFixed(this.doorSlabNode.position))
        console.log('hinge pivot position (local):', this.vectorToFixed(this.doorHingePivot.position))
        console.log('hinge pivot position (world):', this.vectorToFixed(this.hingeDebugInfo?.pivotWorld))
        console.log('door world position before reparent:', this.vectorToFixed(this.hingeDebugInfo?.doorWorldBeforeReparent))
        console.log('door world position after reparent:', this.vectorToFixed(this.hingeDebugInfo?.doorWorldAfterReparent))
        console.log('closed hinge-side gap to right jamb:', this.hingeDebugInfo?.rightJambGapClosed ?? 'N/A')
        console.log('door bounds (local):', this.boundsToFixed(this.hingeDebugInfo?.doorBoundsLocal))
        console.log('frame opening bounds (local, inferred):', this.boundsToFixed(this.hingeDebugInfo?.frameOpeningBoundsLocal))
        console.log('frame bounds (local):', this.boundsToFixed(this.hingeDebugInfo?.frameBoundsLocal))
        console.log('hinge target (local):', this.vectorToFixed(this.hingeDebugInfo?.hingeTargetLocal))
        console.log('hinge edge before align (local):', this.vectorToFixed(this.hingeDebugInfo?.hingeEdgeBeforeLocal))
        console.log('hinge edge after align (local):', this.vectorToFixed(this.hingeDebugInfo?.hingeEdgeAfterLocal))
        console.log('current local rotation y:', this.doorHingePivot.rotation.y)
        console.groupEnd()
    }

    setDebug()
    {
        if(!this.debug.active)
            return

        // Sphere
        const playerFolder = this.debug.ui.getFolder('view/player')

        if(this.helper?.material?.uniforms?.uColor)
        {
            playerFolder.addColor(this.helper.material.uniforms.uColor, 'value')
        }
    }


    update()
    {
        const playerState = this.state.player

        if(!this.portalEntryPoseCaptured && playerState?.position?.current)
        {
            const thirdPerson = this.getPrimaryThirdPersonCameraState()
            if(thirdPerson)
            {
                this.portalEntryPlayerWorld = new THREE.Vector3(
                    playerState.position.current[0],
                    playerState.position.current[1],
                    playerState.position.current[2]
                )
                this.portalEntryCameraTheta = thirdPerson.theta
                this.portalEntryCameraPhi = thirdPerson.phi
                this.portalEntryCameraDistance = thirdPerson.distance
                this.portalEntryCameraAbove = thirdPerson.aboveOffset
                this.portalEntryPoseCaptured = true
            }
        }

        if(this.portalSequenceActive && this.portalDoorFrozenGroupPosition)
        {
            this.group.position.copy(this.portalDoorFrozenGroupPosition)
        }
        else
        {
            this.group.position.set(
                playerState.position.current[0] + DOOR_WORLD_OFFSET_X,
                playerState.position.current[1] + DOOR_WORLD_OFFSET_Y,
                playerState.position.current[2]
            )
        }

        this.capturePortalEntryPoseOnce()

        // Lock door yaw once so camera can orbit without rotating the door.
        if(this.fixedDoorYaw === null)
        {
            const cameraYaw = playerState.camera?.thirdPerson?.theta ?? playerState.rotation
            this.fixedDoorYaw = cameraYaw + DOOR_YAW_OFFSET
        }
        this.helper.rotation.y = this.fixedDoorYaw
        this.updateDoorOpening()
        this.updatePortalSequence()
        this.updateLookHintVisibility()
        // No custom player shader uniforms when using GLB.
    }
}
