import { RGBAColor, RGBColor } from '../color';
import { AbstractZone } from './abstract.zone';
import { planeEquationCoeffs, Point3D, rotatePoint3D } from './vector';

export class PyramidZone implements AbstractZone {
    public readonly vertices: Point3D[];

    public constructor(apex: Point3D, height: number, heading: number, angleFromTip: number) {
        const headingRad = (((heading - 90) % 360) * Math.PI) / 180;
        const tanAngle = Math.tan(angleFromTip * (Math.PI / 180));
        const slantHeight = height * tanAngle;
        const baseCenter: Point3D = [apex[0] - height, apex[1], apex[2]];

        // rotate the center of the base square given the heading

        // Calculate the half distance from the center of the base to its corner
        const halfDiagonal = slantHeight / Math.sqrt(2); // For a square base

        // Initial positions of the base vertices relative to the base center, assuming no rotation
        let baseVertices: Point3D[] = [
            [baseCenter[0], baseCenter[1] - halfDiagonal, baseCenter[2] - halfDiagonal],
            [baseCenter[0], baseCenter[1] + halfDiagonal, baseCenter[2] - halfDiagonal],
            [baseCenter[0], baseCenter[1] + halfDiagonal, baseCenter[2] + halfDiagonal],
            [baseCenter[0], baseCenter[1] - halfDiagonal, baseCenter[2] + halfDiagonal],
        ];

        // The heading is an angle around the Y axis, so we rotate the point around the Y axis
        baseVertices = baseVertices.map(vertex => rotatePoint3D(apex, vertex, headingRad));

        // Add the apex to the list of vertices
        this.vertices = [...baseVertices, apex];
    }

    draw(wallColor: RGBAColor | RGBColor, alpha?: number): void {
        // clone this.vertices
        const baseVertices = [...this.vertices];
        // remove the apex
        const apex = baseVertices.pop();

        if (typeof wallColor[3] === 'undefined') {
            wallColor[3] = alpha || 150;
        }

        this.vertices.forEach(vertex => {
            DrawLine(apex[0], apex[1], apex[2], vertex[0], vertex[1], vertex[2], 255, 0, 0, 150);
        });

        // Draw base edges
        for (let i = 0; i < baseVertices.length; i++) {
            const startVertex = baseVertices[i];
            const endVertex = baseVertices[(i + 1) % baseVertices.length]; // Wrap around to the first vertex

            DrawLine(
                startVertex[0],
                startVertex[1],
                startVertex[2],
                endVertex[0],
                endVertex[1],
                endVertex[2],
                255,
                0,
                0,
                150
            );
        }

        // Draw triangular faces
        for (let i = 0; i < baseVertices.length; i++) {
            const nextVertex = baseVertices[(i + 1) % baseVertices.length];

            DrawPoly(
                apex[0],
                apex[1],
                apex[2],
                baseVertices[i][0],
                baseVertices[i][1],
                baseVertices[i][2],
                nextVertex[0],
                nextVertex[1],
                nextVertex[2],
                wallColor[0],
                wallColor[1],
                wallColor[2],
                wallColor[3]
            );

            DrawPoly(
                nextVertex[0],
                nextVertex[1],
                nextVertex[2],
                baseVertices[i][0],
                baseVertices[i][1],
                baseVertices[i][2],
                apex[0],
                apex[1],
                apex[2],
                wallColor[0],
                wallColor[1],
                wallColor[2],
                wallColor[3]
            );
        }
    }

    isPointInside(point: Point3D): boolean {
        // clone this.vertices
        const baseVertices = [...this.vertices];
        // remove the apex
        const apex = baseVertices.pop();

        const faces = [
            [apex, baseVertices[0], baseVertices[1]],
            [apex, baseVertices[1], baseVertices[2]],
            [apex, baseVertices[2], baseVertices[3]],
            [apex, baseVertices[3], baseVertices[0]],
            [baseVertices[0], baseVertices[1], baseVertices[2]],
        ];

        for (const face of faces) {
            const [A, B, C, D] = planeEquationCoeffs(face[0], face[1], face[2]);
            const isBaseFace =
                face.includes(baseVertices[0]) && face.includes(baseVertices[1]) && face.includes(baseVertices[2]);
            const side = A * point[0] + B * point[1] + C * point[2] + D;

            if ((isBaseFace && side < 0) || (!isBaseFace && side > 0)) {
                return false;
            }
        }

        return true;
    }
}
