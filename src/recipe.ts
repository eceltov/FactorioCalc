import { RecipeTypes } from "./data/recipeTypes";
import getRecipe from "./data/recipes";
import { ResourceTypes } from "./data/resourceTypes";
import { almostLeastCommonMultiple, config, debugLog, getRecipeFromRecipeTypesOrRecipe, getRequiredInventorySlots, printCountAndStackLine } from "./utilities";

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
    if (count === 0) {
      return;
    }

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
  inputs: ResourceMap
  outputs: ResourceMap

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

    /**
   * Join two recipes together and multiply the other recipe so that one of its resources matches
   * the count of a resource of this recipe.
   * @note In case there is no integer multiple of the other recipe that would make the counts
   * match, the multiple will be the floor of the float multiple.
   * @param other The other recipe.
   * @param joinOnThis Resource on which to join from this recipe.
   * @param joinOnOther Resource on which to join on the other recipe.
   * @returns Returns this recipe.
   */
    joinOnOutputNoScaling(other: Recipe, joinOnThis: ResourceTypes, joinOnOther: ResourceTypes) {
      const thisOutputCount = this.outputs.resourceCount(joinOnThis);
      const otherOutputCount = other.outputs.resourceCount(joinOnOther);

      const otherMultiplier = Math.floor(thisOutputCount / otherOutputCount);
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
   * @param recipes Either recipe types or recipes. In case of recipes, their label will be 'custom'.
   * @returns Returns a map from recipe labels to recipes.
   */
  private createRecipeMap(recipes: (RecipeTypes|Recipe)[]) {
    const recipeMap: Map<string, Recipe> = new Map();
    for (let recipe of recipes) {
      if (recipe instanceof Recipe) {
        recipeMap.set('custom', recipe);
      }
      else {
        recipeMap.set(RecipeTypes[recipe], getRecipe(recipe));
      }
    }
    return recipeMap;
  }

  /**
   * Applies recipes one by one that consume a specific output resource of this recipe.
   * The consumed amount of this resource will not be higher than the output of this recipe.
   * In case other consumer inputs matches the outputs of this recipe, they are subtracted and
   * possibly added as extra inputs for each consumer.
   * @note This process is repeated as long as no change occurs.
   * @param consumerDefinitions Definitions of the consumers to be applied.
   * @returns Returns this recipe.
   */
  applyCyclicConsumerRecipes(consumerDefinitions: Iterable<readonly [(RecipeTypes|Recipe), ResourceTypes]>) {
    // update as long as a change occurs
    let update = true;
    while (update) {
      update = false;

      // apply all consumers in order
      for (let [recipe, resource] of consumerDefinitions) {
        // if any consumer changed the recipe, do another iteration
        update ||= this.applyConsumerRecipe(recipe, resource);
      }  
    }

    return this;
  }

  /**
   * Applies recipes one by one that consume a specific output resource of this recipe.
   * The consumed amount of this resource will not be higher than the output of this recipe.
   * In case other consumer inputs matches the outputs of this recipe, they are subtracted and
   * possibly added as extra inputs for each consumer.
   * @param consumerDefinitions Definitions of the consumers to be applied.
   * @returns Returns this recipe.
   */
  applyConsumerRecipes(consumerDefinitions: Iterable<readonly [(RecipeTypes|Recipe), ResourceTypes]>) {
    // apply all consumers in order
    for (let [recipe, resource] of consumerDefinitions) {
      // if any consumer changed the recipe, do another iteration
      this.applyConsumerRecipe(recipe, resource);
    }  

    return this;
  }

  /**
   * Merges a consumer and producer recipe pair.
   * The inputs of the consumer and outputs of the producer cancel each other out when possible.
   * @param consumingRecipe The recipe that consumes the outputs of the producer.
   * @param producingRecipe The recipe that produces new resources.
   * @returns Returns a new, merged recipe
   */
  private static mergeRecipes(consumingRecipe: Recipe, producingRecipe: Recipe) {
    for (let [inputResource, inputCount] of consumingRecipe.inputs.getIterable()) {
      if (producingRecipe.outputs.hasResource(inputResource)) {
        const outputCount = producingRecipe.outputs.resourceCount(inputResource);

        // the production is higher than the consumption
        // the producer output is reduced by the consumer input
        if (outputCount > inputCount) {
          producingRecipe.outputs.addResource(inputResource, -inputCount);
          consumingRecipe.inputs.removeResource(inputResource);
        }
        // both recipes match in resource production/consumption
        // the producer output and consumer input cancel each other out
        else if (outputCount === inputCount) {
          producingRecipe.outputs.removeResource(inputResource);
          consumingRecipe.inputs.removeResource(inputResource);
        }
        // the consumption is higher than the production
        // the consumer input is reduced by the producer production
        else {
          producingRecipe.outputs.removeResource(inputResource);
          consumingRecipe.inputs.addResource(inputResource, -outputCount);
        }
      }
    }

    // merge the recipes together (clone the producer)
    const result = producingRecipe.clone();

    // add the inputs and outputs of the consumer to the producer
    for (let [inputResource, inputCount] of consumingRecipe.inputs.getIterable()) {
      result.inputs.addResource(inputResource, inputCount);
    }
    for (let [outputResource, outputCount] of consumingRecipe.outputs.getIterable()) {
      result.outputs.addResource(outputResource, outputCount);
    }

    return result;
  }

  /**
   * Applies a recipe that consumes a specific output resource of this recipe.
   * The consumed amount of this resource will not be higher than the output of this recipe.
   * In case other consumer inputs matches the outputs of this recipe, they are subtracted and
   * possibly added as extra inputs.
   * @param recipe The consumer recipe to be applied. 
   * @param resource The primary resource to be consumed.
   * @returns Whether the consumer changed this recipe.
   */
  private applyConsumerRecipe(recipe: (RecipeTypes|Recipe), resource: ResourceTypes) {
    const resolvedRecipe = getRecipeFromRecipeTypesOrRecipe(recipe);

    const outputCount = this.outputs.resourceCount(resource);
    const consumerInputCount = resolvedRecipe.inputs.resourceCount(resource);

    const recipeMultiplier = Math.floor(outputCount / consumerInputCount);

    // if the consumer cannot be applied, this recipe cannot be changed.
    if (recipeMultiplier === 0) {
      return false;
    }

    resolvedRecipe.multiply(recipeMultiplier);

    // merge the recipe as a consumer to this one
    const merged = Recipe.mergeRecipes(resolvedRecipe, this);
    this.outputs = merged.outputs;
    this.inputs = merged.inputs;

    return true;
  }

  /**
   * Applies producer recipes to this one, changing the inputs and outputs.
   * The producer recipes will replace any matching input resource of this recipe.
   * @param recipes A list of recipes to be applied.
   * @returns Returns this recipe.
   */
  applyProducerRecipes(recipes: (RecipeTypes|Recipe)[]) {
    // calculate the least common multiple, so that the outputs of the used recipe
    // match the inputs of this recipe (an error margin is used to avoid producing
    // astronomical numbers)
    return this.applyProducerRecipesImpl(recipes, (a, b) => almostLeastCommonMultiple(a, b, config.almostLeastCommonMultipleError));
  }

  /**
   * Applies producer recipes to this one, changing the inputs and outputs.
   * The producer recipes will replace any matching input resource of this recipe, but this recipe
   * will not be multiplied in the process to produce an exact match.
   * @param recipes A list of recipes to be applied.
   * @returns Returns this recipe.
   */
  applyProducerRecipesNoScaling(recipes: (RecipeTypes|Recipe)[]) {
    // multiply this recipe by 1 and the other one by how many time it fits into this one
    return this.applyProducerRecipesImpl(recipes, (a, b) => [1, Math.floor(a / b)]);
  }

  /**
   * Applies producer recipes to this one, changing the inputs and outputs.
   * The producer recipes will replace any matching input resource of this recipe.
   * @param recipes A list of recipes to be applied.
   * @param multiplierFunc A function that generates multipliers between this recipe and an applied one.
   * The inputs are: [input of this recipe, output of the applied recipe].
   * Returns: [this recipe multiplier, applied recipe multiplier].
   * @returns Returns this recipe.
   */
  private applyProducerRecipesImpl(recipes: (RecipeTypes|Recipe)[], multiplierFunc: (a: number, b: number) => [number, number]) {
    // create map of recipe types to recipes
    const recipeMap = this.createRecipeMap(recipes);

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
        
        // take the first match (is there an easy way to find out if the others would be better?)
        const outputType: ResourceTypes = matches[0];
        
        debugLog(`Applying recipe ${recipeType}. Matched resource: ${ResourceTypes[outputType]}`);
        
        // the number of inputs required by this recipe
        const currentInput: number = this.inputs.resourceCount(outputType);
        // the number of outputs produced by the used recipe
        const recipeOutput: number = recipe.outputs.resourceCount(outputType);
        
        const [inputMultiplier, outputMultiplier] = multiplierFunc(currentInput, recipeOutput);
        
        // if a suitable multiple does not exist, continue
        if (outputMultiplier === 0) {
          continue;
        }

        update = true;
        
        this.multiply(inputMultiplier);

        // copy the recipe so it is not changed in the next iteration
        recipe = recipe.clone();
        recipe.multiply(outputMultiplier)

        const merged = Recipe.mergeRecipes(this, recipe);
        this.outputs = merged.outputs;
        this.inputs = merged.inputs;
      }
    }

    return this;
  }
}
