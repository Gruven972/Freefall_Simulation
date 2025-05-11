// --- script.js ---
import { FreeFallObject } from './FreeFallObject.js';
import { Environment } from './Environment.js';
import { environments, freefallObjects } from './Data.js';

const Dom = {
    byId: id => document.getElementById(id),
    configureButton: (id, handler) => {
        const button = Dom.byId(id);
        button.addEventListener("click", handler);
        return button;
    },
    setupForceDisplay: (id, color) => {
        const el = Dom.byId(id);
        el.style.color = color;
        return el;
    }
};

function setupDisplays() {
    return {
        force: {
            gravity: Dom.setupForceDisplay("force-gravity", "#ff0000"),
            drag: Dom.setupForceDisplay("force-drag", "#00ff00"),
            buoyancy: Dom.setupForceDisplay("force-buoyancy", "#0000ff"),
            normal: Dom.setupForceDisplay("force-normal", "#800080"),
            net: Dom.setupForceDisplay("force-net", "#ffffff")
        },
        object: {
            name: Dom.byId("object-name"),
            mass: Dom.byId("object-mass"),
            dragCoefficient: Dom.byId("object-dragCoefficient"),
            frontalArea: Dom.byId("object-frontalArea"),
            volume: Dom.byId("object-volume"),
            acceleration: Dom.byId("object-acceleration"),
            velocity: Dom.byId("object-velocity"),
            position: Dom.byId("object-position"),
            time: Dom.byId("object-time")
        },
        environment: {
            name: Dom.byId("environment-name"),
            gravity: Dom.byId("environment-gravity"),
            airDensity: Dom.byId("environment-airDensity")
        }
    };
}

(async function() {

    const { force: forceDisplays, object: objectDisplays, environment: environmentDisplays } = setupDisplays();

    // Button Setup
        Dom.configureButton("restart", handleReset);
        const pauseBtn = Dom.configureButton("pause", handlePauseToggle);
        Dom.configureButton("atmosphereToggle", handleAtmosphereToggle);
        Dom.configureButton("nextObject", handleNextObject);
        Dom.configureButton("nextEnvironment", handleNextEnvironment);
    

    // Button Handlers
    function handleReset(){
        simulationState.simulationTime = 0;
        freefallObject.Reset(startingHeight);
        if(simulationState.running) handlePauseToggle();
        console.log("Simulation reset.");
    }

    function handlePauseToggle(){
        simulationState.running = !simulationState.running;
        pauseBtn.textContent = simulationState.running ? "⏸ Pause" : "▶ Play";
        console.log(simulationState.running ? "Simulation playing." : "Simulation paused.");
    }

    function handleAtmosphereToggle(){
        simulationState.useAtmosphere = !simulationState.useAtmosphere;
        simulationState.useDrag = simulationState.useAtmosphere;
        simulationState.useBuoyancy = simulationState.useAtmosphere;
        console.log(simulationState.useAtmosphere ? "Atmosphere on." : "Atmosphere off.");
    }

    function handleNextObject(){
        freefallObjectIndex++;
        if(freefallObjectIndex >= freefallObjects.length) freefallObjectIndex = 0;
        SetFreefallObject(freefallObjectIndex, true);
    }

    function handleNextEnvironment(){
        environmentIndex++;
        if(environmentIndex >= environments.length) environmentIndex = 0;
        SetEnvironment(environmentIndex, true);
    }

    // PIXI setup
    const app = new PIXI.Application();
    await app.init({ width: 640, height: 490 });
    document.body.appendChild(app.canvas);

    // Graphics
    const objMaxPixelY = 50;
    const groundPixelY = 440;
    const objPixelX = 320;
    const maxHeight = 1000;
    const pixelRange = objMaxPixelY - groundPixelY;

    const desiredObjSpriteSize = 16;
    const boxSprite = await PIXI.Assets.load('sprites/Box.png');
    const ballSprite = await PIXI.Assets.load('sprites/Ball.png');
    const panelSprite = await PIXI.Assets.load('sprites/Panel.png');
    let objectSprites = [
        boxSprite,
        ballSprite,
        panelSprite,
    ]
    let objectSprite = PIXI.Sprite.from(boxSprite);
    objectSprite.anchor.set(0.5, 1);
    objectSprite.x = objPixelX;
    objectSprite.y = groundPixelY;
    objectSprite.scale.set(desiredObjSpriteSize/ objectSprite.texture.width, desiredObjSpriteSize/ objectSprite.texture.height);

    const earthSprite = await PIXI.Assets.load('sprites/Earth_bg.png');
    const moonSprite = await PIXI.Assets.load('sprites/Moon_bg.png');
    const jupiterSprite = await PIXI.Assets.load('sprites/Jupiter_bg.png');
    let environmentSprites = [
        earthSprite,
        moonSprite,
        jupiterSprite,
    ]
    let environmentSprite = PIXI.Sprite.from(earthSprite);
    app.stage.addChild(objectSprite, environmentSprite);

    // Ground & Height
    const groundLine = new PIXI.Graphics();
    groundLine.moveTo(0, groundPixelY);
    groundLine.lineTo(640, groundPixelY);
    groundLine.stroke({ color: 0xffffff, width: 2 });
    app.stage.addChild(groundLine);

    const lineLabelStyle = new PIXI.TextStyle({ fill: "#ffffff", fontSize: 12 });
    const lineCount = 4;
    const line = new PIXI.Graphics();
    for (let h = 1; h <= lineCount; h ++) {
        const pixelY = groundPixelY + (h / lineCount * pixelRange);
    
        line.moveTo(275, pixelY);
        line.lineTo(300, pixelY);
    
        const label = new PIXI.Text(`${h / lineCount * maxHeight}m`, lineLabelStyle);
        label.x = 260;
        label.y = pixelY - 15; // slight offset above line
        app.stage.addChild(label);
    }
    line.stroke({ color: 0xffffff, width: 2 });
    app.stage.addChild(line);

    // Forces
    const forceGravityArrow = new PIXI.Graphics();
    const forceDragArrow = new PIXI.Graphics();
    const forceBouyancyArrow = new PIXI.Graphics();
    const forceNormalArrow = new PIXI.Graphics();
    const forceNetArrow = new PIXI.Graphics();
    const forceArrowContainer = new PIXI.Container();
    forceArrowContainer.addChild(forceGravityArrow, forceDragArrow, forceBouyancyArrow, forceNormalArrow, forceNetArrow);
    forceArrowContainer.position.set(500, 150);
    app.stage.addChild(forceArrowContainer);


    // Simulation variables
    const simulationState = {
        running: false,
        simulationTime: 0,
        runTime: 0,
        useAtmosphere: true,
        useDrag: true,
        useBuoyancy: true
    }
    let startingHeight = 1000; // (m)  #TODO make this adjustable?


    // Object Setup
    let environmentIndex = 0;
    let environment = environments[environmentIndex];
    SetEnvironment(environmentIndex);
    
    let freefallObjectIndex = 0;
    let freefallObject = freefallObjects[freefallObjectIndex];
    SetFreefallObject(freefallObjectIndex);
    
    handleReset();

    function SetEnvironment(index, reset = false){
        environment = environments[index];
        environmentDisplays.name.textContent = environment.name;
        environmentDisplays.gravity.textContent = environment.gravity;
        environmentDisplays.airDensity.textContent = environment.airDensity;

        if(app.stage.children.includes(environmentSprite)){
            app.stage.removeChild(environmentSprite);
        }
        const environmentTexture = environmentSprites[index];
        environmentSprite = PIXI.Sprite.from(environmentTexture);
        app.stage.addChildAt(environmentSprite, 0);

        if (reset) handleReset();
    }

    function SetFreefallObject(index, reset = false){
        freefallObject = freefallObjects[index];
        objectDisplays.name.textContent = freefallObject.name;
        objectDisplays.mass.textContent = freefallObject.mass;
        objectDisplays.dragCoefficient.textContent = freefallObject.dragCoefficient;
        objectDisplays.frontalArea.textContent = freefallObject.frontalArea;
        objectDisplays.volume.textContent = freefallObject.volume;

        if(app.stage.children.includes(objectSprite)){
            app.stage.removeChild(objectSprite);
        }
        const objectTexture = objectSprites[index];
        objectSprite = PIXI.Sprite.from(objectTexture);
        objectSprite.anchor.set(0.5, 1);
        objectSprite.x = objPixelX;
        objectSprite.y = groundPixelY;
        objectSprite.scale.set(
            desiredObjSpriteSize / objectSprite.texture.width,
            desiredObjSpriteSize / objectSprite.texture.height
        );
        app.stage.addChild(objectSprite);

        if(reset) handleReset();
    }

    function SetFreefallObjectPos(){
        objectSprite.x = objPixelX;
        objectSprite.y = (freefallObject.position / maxHeight) * pixelRange + groundPixelY;
    }

    // Update
    app.ticker.add(() => {
        // Get Delta Time
        const deltaTime = app.ticker.deltaMS / 1000;
        simulationState.runTime += deltaTime;

        // Update simulation
        if (simulationState.running){
            simulationState.simulationTime += deltaTime;

            // Update object
            freefallObject.Update(environment, deltaTime, simulationState.useDrag, simulationState.useBuoyancy);
            SetFreefallObjectPos();

            // Update force arrows
            renderForceArrows();

            // Update force text
            updateForceText();

            // Update motion text
            updateMotionText();
        } 

        // Debug
        if (Math.abs(simulationState.runTime % 1.0) < deltaTime) {
            console.log(`Simulation Time = ${simulationState.simulationTime.toFixed(2)}s`);
            freefallObject.DebugState();
        }
    });

    function renderForceArrows(){
        // Update force arrows
        const desiredArrowLength = 100;
        const arrowScale = desiredArrowLength / Math.abs(freefallObject.forceGravity);
        const originX = 0;
        const originY = 0;
        drawForceArrow(forceGravityArrow, originX, originY, 0, -freefallObject.forceGravity * arrowScale, 0xff0000); // red
        drawForceArrow(forceDragArrow, originX, originY, 0, -freefallObject.forceDrag * arrowScale, 0x00ff00); // green
        drawForceArrow(forceBouyancyArrow, originX, originY + (-freefallObject.forceDrag * arrowScale), 0, -freefallObject.forceBuoyancy * arrowScale, 0x0000ff); // blue
        drawForceArrow(forceNormalArrow, originX, originY + (-freefallObject.forceBuoyancy * arrowScale), 0, -freefallObject.normalForce * arrowScale, 0x800080); // pruple
        drawForceArrow(forceNetArrow, originX + 50, originY, 0, -freefallObject.forceTotal * arrowScale, 0xffffff); // white
    }

    // Force arrow setup
    function drawForceArrow(graphic, startX, startY, forceX, forceY, color = 0xff0000) {
        graphic.clear();

        if(forceX === 0 && forceY === 0) return;
        
        graphic.moveTo(startX, startY);
        const endX = startX + forceX;
        const endY = startY + forceY;
        graphic.lineTo(endX, endY);
    
        // Draw arrowhead
        const angle = Math.atan2(forceY, forceX);
        const headLength = 10;
    
        graphic.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        graphic.moveTo(endX, endY);
        graphic.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6)
        );

        graphic.stroke({ color: color, width: 3 });
    }

    function updateForceText(){
        forceDisplays.gravity.textContent = freefallObject.forceGravity.toFixed(2);
        forceDisplays.drag.textContent = freefallObject.forceDrag.toFixed(2);
        forceDisplays.buoyancy.textContent = freefallObject.forceBuoyancy.toFixed(2);
        forceDisplays.normal.textContent = freefallObject.normalForce.toFixed(2);
        forceDisplays.net.textContent = freefallObject.forceTotal.toFixed(2);
    }

    function updateMotionText(){
        objectDisplays.acceleration.textContent = freefallObject.acceleration.toFixed(2);
        objectDisplays.velocity.textContent = freefallObject.velocity.toFixed(2);
        objectDisplays.position.textContent = freefallObject.position.toFixed(2);
        objectDisplays.time.textContent = freefallObject.time.toFixed(2);
    }

})();