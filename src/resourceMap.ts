import { ResourceTypes } from "./data/resourceTypes";
import { debugLog, printCountAndStackLine } from "./utilities";

export class ResourceMap {
  private readonly map: Map<ResourceTypes, number>

  constructor(map: Map<ResourceTypes, number>) {
    this.map = map;
  }

  getIterable() {
    return this.map.entries();
  }

  /**
   * Removes a resource from the map.
   * @param resource The type of the resource.
   */
  removeResource(resource: ResourceTypes) {
    this.map.delete(resource);
  }

  /**
   * Adds a resource to the map. If already present, its count is increased.
   * @param resource The type of the resource.
   * @param count The count to be added.
   * @returns Returns this resource map.
   */
  addResource(resource: ResourceTypes, count: number) {
    if (count === 0) {
      return;
    }

    if (this.map.has(resource)) {
      this.map.set(resource, this.map.get(resource)! + count);
    }
    else {
      this.map.set(resource, count);
    }

    return this;
  }

  hasResource(resource: ResourceTypes): Boolean {
    return this.map.has(resource);
  }

  getResourceTypes(): ResourceTypes[] {
    return Array.from(this.map.keys());
  }

  join(other: ResourceMap) {
    for (let [resource, count] of other.map) {
      this.addResource(resource, count);
    }
  }

  resourceCount(resource: ResourceTypes): number {
    if (!this.map.has(resource)) {
      return 0;
    }

    return this.map.get(resource)!;
  }

  /**
   * Multiplies all values.
   * @param multiplier The multiplier.
   */
  multiply(multiplier: number) {
    for (let [resource, count] of this.map) {
      this.map.set(resource, count * multiplier);
    }
  }

  print() {
    for (let [resource, count] of this.map) {
      printCountAndStackLine(resource, count);
    }
  }

  clone(): ResourceMap {
    return new ResourceMap(new Map(this.map));
  }

  /**
   * Checks whether two resource maps contain the same resources and counts.
   * @param other The other resource map to compare.
   * @param printDifference Whether the difference should be shown in logs.
   * @returns Returns whether the maps have the same content.
   */
  equals(other: ResourceMap, printDifference: boolean = false): boolean {
    let equal = true;

    if (this.map.size !== other.map.size) {
      equal = false
      if (printDifference) {
        console.log(`ResourceMap mismatch: Expected size ${this.map.size}, received ${other.map.size}.`);
      }
    }

    for (let [resource, count] of this.map) {
      const otherCount = other.resourceCount(resource);
      if (otherCount !== count) {
        equal = false;
        ///TODO: resources not present in this map are not shown
        if (printDifference) {
          console.log(`ResourceMap mismatch: Expected ${count} ${ResourceTypes[resource]}, received ${otherCount}.`);
        }
      }
    }

    return equal;
  }

    /**
   * Checks whether two resource maps contain the same resources and counts.
   * @param other The other resource map to compare.
   * @param printDifference Whether the difference should be shown in the debug logs.
   * @returns Returns whether the maps have the same content.
   */
    equalsVerbose(other: ResourceMap): boolean {
      return this.equals(other, true);
    }
}
