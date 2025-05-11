import { FreeFallObject } from './FreeFallObject.js';
import { Environment } from './Environment.js';

export const environments = [
    new Environment("Earth", -9.81, 1.225),
    new Environment("Moon", -1.62, 0.000000000000003),
    new Environment("Jupiter", -24.79, 0.16)
];

export const freefallObjects = [
    new FreeFallObject("Large Cube", 500, 1.0, 1.0, 1.0),
    new FreeFallObject("Small Sphere", 50, 0.5, 0.13, 0.034),
    new FreeFallObject("Flat Panel", 50, 1.28, 1.0, 0.1)
];