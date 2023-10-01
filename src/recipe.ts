import { RecipeTypes } from "./data/recipeTypes";
import getRecipe from "./data/recipes";
import { ResourceTypes } from "./data/resourceTypes";
import { almostLeastCommonMultiple, config, debugLog, getRequiredInventorySlots, printCountAndStackLine } from "./utilities";

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
   * @param type The type of the resource.
   */
  removeResource(type: ResourceTypes) {
    this.map.delete(type);
  }

  /**
   * Adds a resource to the map. If already present, its count is increased.
   * @param type The type of the resource.
   * @param count The count to be added.
   */
  addResource(type: ResourceTypes, count: number) {
    if (this.map.has(type)) {
      this.map.set(type, this.map.get(type)! + count);
    }
    else {
      this.map.set(type, count);
    }
  }

  hasResource(type: ResourceTypes): Boolean {
    return this.map.has(type);
  }

  getResourceTypes(): ResourceTypes[] {
    return Array.from(this.map.keys());
  }

  join(other: ResourceMap) {
    for (let [resource, count] of other.map) {
      this.addResource(resource, count);
    }
  }

  resourceCount(type: ResourceTypes): number {
    if (!this.map.has(type)) {
      return 0;
    }

    return this.map.get(type)!;
  }

  /**
   * Multiplies all values.
   * @param multiplier The multiplier.
   */
  multiply(multiplier: number) {
    for (let [type, count] of this.map) {
      this.map.set(type, count * multiplier);
    }
  }

  print() {
    for (let [type, count] of this.map) {
      printCountAndStackLine(type, count);
    }
  }

  clone(): ResourceMap {
    return new ResourceMap(new Map(this.map));
  }
}

export class Recipe {
  readonly inputs: ResourceMap
  readonly outputs: ResourceMap

  constructor(inputs: ResourceMap, outputs: ResourceMap) {
    this.inputs = inputs;
    this.outputs = outputs;
  }

  getOutputTypes(): ResourceTypes[] {
    return this.outputs.getResourceTypes();
  }
  
  /**
   * Multiplies all inputs and outputs of the recipe.
   * @param multiplier The multiplier.
   */
  multiply(multiplier: number) {
    this.inputs.multiply(multiplier);
    this.outputs.multiply(multiplier);

    return this;
  }

  /**
   * Joins the inputs and outputs of this and another recipe.
   * @param other The other recipe to add to this one.
   * @returns Returns this recipe.
   */
  join(other: Recipe) {
    this.inputs.join(other.inputs);
    this.outputs.join(other.outputs);

    return this;
  }

  /**
   * Join two recipes together so that an output resource of both recipes matches in count.
   * @param other The other recipe.
   * @param joinOnThis Resource on which to join from this recipe.
   * @param joinOnOther Resource on which to join on the other recipe.
   * @param exact Whether an exact LCD algorithm should be used.
   * @returns Returns this recipe.
   */
  joinOnOutput(other: Recipe, joinOnThis: ResourceTypes, joinOnOther: ResourceTypes, exact: Boolean = true) {
    const thisOutputCount = this.outputs.resourceCount(joinOnThis);
    const otherOutputCount = other.outputs.resourceCount(joinOnOther);

    const error = (exact ? 0 : config.almostLeastCommonMultipleError);
    let [thisMultiplier, otherMultiplier] = almostLeastCommonMultiple(thisOutputCount, otherOutputCount, error);

    this.multiply(thisMultiplier);
    other.multiply(otherMultiplier);

    return this.join(other);
  }

  clone() {
    return new Recipe(this.inputs.clone(), this.outputs.clone());
  }

  print() {
    console.log('######## Outputs (stacks) ########');
    console.log();
    this.outputs.print();
    console.log();
    console.log('######## Inputs (stacks) ########');
    console.log();
    this.inputs.print();
    console.log();
    console.log(`Inputs take up ${getRequiredInventorySlots(this.inputs)} inventory slots.`);
    console.log();
    console.log('##################################');

    return this;
  }

  removeInputs(resources: ResourceTypes[]) {
    resources.forEach(resource => {
      this.inputs.removeResource(resource);
    });
    return this;
  }

  /**
   * Applies other recipes to this one, changing the inputs and outputs.
   * The recipes will replace any matching input resource of this recipe.
   * @param recipes A list of recipe types to be applied.
   */
  applyRecipes(recipes: (RecipeTypes|Recipe)[]) {
    // create map of recipe types to recipes
    const recipeMap: Map<string, Recipe> = new Map();
    for (let recipe of recipes) {
      if (recipe instanceof Recipe) {
        recipeMap.set('custom', recipe);
      }
      else {
        recipeMap.set(RecipeTypes[recipe], getRecipe(recipe));
      }
    }

    // as long as the last iteration changed the recipe, do another iteration
    let update: Boolean = true;
    while (update) {
      update = false;

      // try to apply all recipes
      for (let [recipeType, recipe] of recipeMap) {
        // find outputs of the recipe that match the inputs of this recipe
        const matches: ResourceTypes[] = recipe.getOutputTypes().filter(outputType => this.inputs.hasResource(outputType));

        // skip this recipe if it is not usable
        if (matches.length === 0) {
          continue;
        }

        update = true;
        
        // take the first match (is there an easy way to find out if the others would be better?)
        const outputType: ResourceTypes = matches[0];

        debugLog(`Applying recipe ${recipeType}. Matched resource: ${ResourceTypes[outputType]}`);
        
        // the number of inputs required by this recipe
        const currentInput: number = this.inputs.resourceCount(outputType);
        // the number of outputs produced by the used recipe
        const recipeOutput: number = recipe.outputs.resourceCount(outputType);

        // calculate the least common multiple, so that the outputs of the used recipe
        // match the inputs of this recipe (an error margin of 5 % is used to not result
        // in astronomical numbers)
        const [inputMultiplier, outputMultiplier] = almostLeastCommonMultiple(currentInput, recipeOutput, config.almostLeastCommonMultipleError);
        this.multiply(inputMultiplier);

        // copy the recipe so it is not changed in the next iteration
        recipe = recipe.clone();
        recipe.multiply(outputMultiplier)

        // remove the input of this recipe (will be replaced with inputs of the other one)
        this.inputs.removeResource(outputType);

        // replace inputs
        for (let [recipeInputType, recipeInputCount] of recipe.inputs.getIterable()) {
          this.inputs.addResource(recipeInputType, recipeInputCount)
        }

        // add all the other outputs of the used recipe
        const otherOutputs: ResourceTypes[] = recipe.outputs.getResourceTypes().filter(output => output !== outputType);
        otherOutputs.forEach(output => {
          this.outputs.addResource(output, recipe.outputs.resourceCount(output));
        });
      }
    }

    return this;
  }
}
