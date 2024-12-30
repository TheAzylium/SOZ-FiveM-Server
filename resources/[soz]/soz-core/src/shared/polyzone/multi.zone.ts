import { RGBColor } from '../color';
import { AbstractZone } from './abstract.zone';
import { PolygonZone } from './polygon.zone';
import { Point3D } from './vector';

export class MultiZone<T extends PolygonZone<D>, D = never> implements AbstractZone {
    public zones: T[];

    public constructor(zones: T[] = []) {
        this.zones = zones;
    }

    public addZone(zone: T): void {
        this.zones.push(zone);
    }

    public isPointInside(point: Point3D): boolean {
        return this.zones.some(zone => zone.isPointInside(point));
    }

    public getZoneInside(point: Point3D): T | null {
        return this.zones.find(zone => zone.isPointInside(point)) || null;
    }

    public draw(wallColor: RGBColor, alpha: number): void {
        this.zones.forEach(zone => zone.draw(wallColor, alpha));
    }
}
