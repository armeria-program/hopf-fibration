const THREE = require('three');

const defaultPoint = new THREE.Vector3(1, 0, 0);
var validPoint = false;
var showPreview = true;


// Get discretized fiber over the given point
function getFiberPoints(point = defaultPoint, divisions = 256) {
    const alpha = Math.sqrt((1 + point.y)/2);
    const beta = Math.sqrt((1 - point.y)/2);

    const angleSum = Math.atan2(-point.x, point.z);

    const points = [];
    for (var i = 0; i < divisions+1; i++) {
        const theta = 2*Math.PI * i/divisions;
        const phi = angleSum - theta;

        const proj = 0.5 / (1 - alpha * Math.sin(theta));
        const b = -beta * Math.cos(phi);
        const c = alpha * Math.cos(theta);
        const d = -beta * Math.sin(phi);

        points.push(b*proj, c*proj, d*proj);
    }

    return Float32Array.from(points);
}

// Get fiber, rendered as torus, over the given point
function getTorus(point = defaultPoint) {
    const alpha = Math.sqrt((1 + point.y)/2);
    const beta = Math.sqrt((1 - point.y)/2);

    const angleSum = Math.atan2(-point.x, point.z);
    const scale = 0.5;

    
    // Maximum a (theta = 90)
    const left = new THREE.Vector3(
        -beta * Math.sin(angleSum),
        0,
        beta * Math.cos(angleSum)
    );
    left.multiplyScalar(scale / (1 - alpha));

    // Minimum a (theta = -90)
    const right = new THREE.Vector3(
        beta * Math.sin(angleSum),
        0,
        -beta * Math.cos(angleSum)
    );
    right.multiplyScalar(scale / (1 + alpha));

    // Arbitrary point in plane (theta = 0)
    const other = new THREE.Vector3(
        -beta * Math.cos(angleSum),
        alpha,
        -beta * Math.sin(angleSum)
    );
    other.multiplyScalar(scale);

    const center = left.clone();
    center.lerp(right, 0.5);

    right.sub(center);
    other.sub(center);

    // Compute normal to plane
    other.cross(right);
    other.normalize();

    const radius = right.length();

    const segments = Math.min(Math.max(16, Math.ceil(radius * 64)), 256);
    const geometry = new THREE.TorusBufferGeometry(radius, 0.02, 8, segments);

    const torusMaterial = new THREE.MeshLambertMaterial({color: fiberMaterial.color});
    const torusObj = new THREE.Mesh(geometry, torusMaterial);

    torusObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), other);
    torusObj.position.copy(center);

    return torusObj;
}

// Get color corresponding to a given point on the sphere.
// Mapping is essentially arbitrary, just needs to look 'interesting'
function pointToColor(point) {
    const hue = Math.atan2(point.x, point.z) / (2 * Math.PI) + 0.5;
    const lightness = 0.15 * point.y + 0.5;

    const color = new THREE.Color();
    color.setHSL((hue + 2 * lightness) % 1, 0.7, lightness);
    return color;
}

// Update the scene based on the currently targeted point of S^2
function update(point) {
    validPoint = (point !== undefined);

    const visible = validPoint && showPreview;
    newPoint.visible = visible;
    newFiber.visible = visible;

    if (validPoint) {
        const color = pointToColor(point);

        newPoint.position.copy(point);
        newPoint.material.color.copy(color);

        newFiber.geometry.attributes.position.copyArray(getFiberPoints(point));
        newFiber.geometry.attributes.position.needsUpdate = true;
        newFiber.material.color.copy(color);
    }
}

// Add the currently selected point
function addPoint() {
    if (validPoint) {
        // Add new point
        const addedPointMaterial = new THREE.MeshBasicMaterial({color: newPointMaterial.color});
        const addedPoint = new THREE.Mesh(newPointGeo, addedPointMaterial);
        addedPoint.position.copy(newPoint.position);
        inset.add(addedPoint);

        // Add new torus
        const addedFiber = getTorus(newPoint.position);
        scene.add(addedFiber);
    }
}


/***** Main Scene *****/
const scene = new THREE.Scene();

const fiberGeo = new THREE.BufferGeometry();
fiberGeo.setAttribute('position', new THREE.BufferAttribute(getFiberPoints(), 3));
const fiberMaterial = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 5});
const newFiber = new THREE.Line(fiberGeo, fiberMaterial);
scene.add(newFiber);

// Lighting
const light = new THREE.PointLight(0xffffff);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);
scene.add(ambientLight);


/***** Inset Scene *****/
const inset = new THREE.Scene();

const sphereGeo = new THREE.SphereBufferGeometry(1, 64, 32);
const sphereMaterial = new THREE.MeshLambertMaterial({color: 0x444444, transparent: true, opacity: 0.6});
const sphere = new THREE.Mesh(sphereGeo, sphereMaterial);
inset.add(sphere);

const axesGeo = new THREE.BufferGeometry();
const axesGeoPoints = new Float32Array([
    0.0, 0.0, 0.0,
    0.5, 0.0, 0.0,
    0.0, 0.0, 0.0,
    0.0, 0.5, 0.0,
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.5,
]);
axesGeo.setAttribute('position', new THREE.BufferAttribute(axesGeoPoints, 3));
const axesMaterial = new THREE.LineBasicMaterial({color: 0x888888, linewidth: 3});
const axes = new THREE.LineSegments(axesGeo, axesMaterial);
inset.add(axes);

const newPointGeo = new THREE.SphereBufferGeometry(0.02, 32, 16);
const newPointMaterial = new THREE.MeshBasicMaterial();
const newPoint = new THREE.Mesh(newPointGeo, newPointMaterial);
inset.add(newPoint);


// Lighting
const insetAmbientLight = new THREE.AmbientLight(0xffffff);
inset.add(insetAmbientLight);

// Exports
exports.scene = scene;
exports.inset = inset;

exports.sphere = sphere;
exports.light = light;

exports.update = update;
exports.addPoint = addPoint;

function setMobileFlag(flag) {showPreview = !flag;}
exports.setMobileFlag = setMobileFlag;


// Demo
/*
for (var i = 0; i < 32; i++) {
    const theta = 2*Math.PI * i/32;
    update(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
    addPoint();
}
*/
/*
for (var i = 10; i < 32; i++) {
    const theta = 2*Math.PI * i/32;
    update(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
    addPoint();

    update(new THREE.Vector3(0.5 * Math.cos(theta), -Math.sqrt(3) / 2, 0.5 * Math.sin(theta)));
    addPoint();
}
*/
