export class FreeFallObject {

    constructor(name, mass, dragCoefficient, frontalArea, volume) {
        this.name = name; // (m/s^2)
        this.mass = mass; // (kg)
        this.dragCoefficient = dragCoefficient; // rho or p
        this.frontalArea = frontalArea; // A (m2)
        this.volume = volume; // V 
        this.position = 0; // y (m)
        this.velocity = 0; // v (m/s)
        this.acceleration = 0 // a (m/s^2)
        this.forceGravity = 0; // (N)
        this.forceDrag = 0; // (N)
        this.forceBuoyancy = 0; // (N)
        this.normalForce = 0; // (N)
        this.forceTotal = 0; // (N)
        this.time = 0.0;// (s)
    }

    Reset(position){
        this.position = position;
        this.velocity = 0;
        this.time = 0.0;
        this.forceGravity = 0;
        this.forceDrag = 0; 
        this.forceBuoyancy = 0; 
        this.normalForce = 0; 
        this.forceTotal = 0; 
        this.time = 0.0;
    }

    CalculateGravityForce(environment) { // f = m * a
        this.forceGravity = this.mass * environment.gravity;
    }

    CalculateDragForce(environment, useDrag = true) { // F = rho(p) * C * A * v^2
        if(useDrag && this.position > 0){
            const dragDirection = this.velocity >= 0 ? -1 : 1;
            this.forceDrag = 0.5 * environment.airDensity * this.dragCoefficient * this.frontalArea * this.velocity * this.velocity * dragDirection;
        } 
        else this.forceDrag = 0;
    }

    CalculateBuoyancyForce(environment, useBuoyancy = true) { // F = rho(p) * V * g
        if(useBuoyancy){
            const buoyancyDirection = environment.gravity >= 0 ? -1 : 1;
            this.forceBuoyancy = environment.airDensity * this.volume * Math.abs(environment.gravity) * buoyancyDirection;
        } 
        else this.forceBuoyancy = 0;
    }

    CalculateNormalForce(){ // F = (-1 * Fg) - Fb;
        this.normalForce = this.position > 0 ? 0 : (-1 * this.forceGravity) - this.forceBuoyancy;
    }

    CalculateNetForce(environment, useDrag = true, useBuoyancy = true) {
        this.CalculateGravityForce(environment);
        this.CalculateDragForce(environment, useDrag);
        this.CalculateBuoyancyForce(environment, useBuoyancy);
        this.CalculateNormalForce();
        this.forceTotal = this.forceGravity + this.forceDrag + this.forceBuoyancy + this.normalForce;
    }

    CalculateAcceleration(environment, useDrag = true, useBuoyancy = true) {
        this.CalculateNetForce(environment, useDrag, useBuoyancy);
        this.acceleration = this.forceTotal / this.mass;
    }

    Update(environment, deltaTime, useDrag = true, useBuoyancy = true) { // Basic riemman sums (right)
        this.CalculateAcceleration(environment, useDrag, useBuoyancy); 
        this.velocity += this.acceleration * deltaTime;
        this.position += this.velocity * deltaTime;
        this.position = Math.max(this.position, 0);
        if(this.position > 0) this.time += deltaTime;
        else{
            this.velocity = 0;
        }
    }

    UpdateRK4(environment, deltaTime, useDrag = true, useBuoyancy = true) { //Runge-Kutta 4th Order More accurate by using last frame, mid frame and end frame and averaging them
        const state = {
            position: this.position,
            velocity: this.velocity
        };
    
        const state1 = this.CalculateState(state, environment, useDrag, useBuoyancy); // last frame state
    
        const state2 = this.CalculateState({  // Mid frame state(1) built using last frame state
            position: state.position + state1.dx * deltaTime * 0.5,
            velocity: state.velocity + state1.dv * deltaTime * 0.5
        }, environment, useDrag, useBuoyancy);
    
        const state3 = this.CalculateState({ // Mid frame(2) state built using mid frame state
            position: state.position + state2.dx * deltaTime * 0.5,
            velocity: state.velocity + state2.dv * deltaTime * 0.5
        }, environment, useDrag, useBuoyancy);
    
        const state4 = this.CalculateState({ // End Frame state
            position: state.position + state3.dx * deltaTime,
            velocity: state.velocity + state3.dv * deltaTime
        }, environment, useDrag, useBuoyancy);
    
        const dx = (state1.dx + 2 * state2.dx + 2 * state3.dx + state4.dx) / 6; // Average Velocity
        const dv = (state1.dv + 2 * state2.dv + 2 * state3.dv + state4.dv) / 6; // Average Acceleration
    
        this.position += dx * deltaTime;
        this.velocity += dv * deltaTime;
        this.position = Math.max(this.position, 0);
    
        if (this.position > 0) this.time += deltaTime;
        else this.velocity = 0;
    }

    CalculateState(state, environment, useDrag, useBuoyancy) {
        // Simulate what acceleration would be at a given state
        const { position, velocity } = state;
    
        // Save original state
        const originalPosition = this.position;
        const originalVelocity = this.velocity;
    
        // Temporarily set object to simulate forces at this state
        this.position = position;
        this.velocity = velocity;
        this.CalculateAcceleration(environment, useDrag, useBuoyancy);
        const a = this.acceleration;
    
        // Restore original state
        this.position = originalPosition;
        this.velocity = originalVelocity;
    
        return {
            dx: velocity,
            dv: a
        };
    }

    DebugState() {
        console.log(`${this.name} Forces: Gravity=${this.forceGravity.toFixed(2)} N, Drag=${this.forceDrag.toFixed(2)} N, Buoyancy=${this.forceBuoyancy.toFixed(2)} N, Normal=${this.normalForce.toFixed(2)} N, Net=${this.forceTotal.toFixed(2)} N`);
        console.log(`${this.name} Kinematics: a=${this.acceleration.toFixed(2)} m/s^2 v=${this.velocity.toFixed(2)} m/s, x=${this.position.toFixed(2)} m`);
    }
}