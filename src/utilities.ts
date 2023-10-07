import { readFile, readFileSync } from "fs";
import { RecipeTypes } from "./data/recipeTypes";
import { ResourceTypes } from "./data/resourceTypes";
import { Recipe } from "./recipe";
import path from "path";
import { stackSizes } from "./data/stackSizes";
import getRecipe from "./data/recipes";
import { ResourceMap } from "./resourceMap";

const config = JSON.parse(readFileSync(path.join(__dirname, '../config.json')).toString());

/**
 * Computes something close to a least common multiple.
 * Instead of the result being divisible by both numbers, there are two results,
 * each divisible by one of the two numbers, but these results are close to each other.
 * The closeness of the results is set by the error parameter.
 * @param a The first number.
 * @param b The second number.
 * @param error The allowed relative difference between the two 'almost' least common multiples.
 * An error of 0.05 means the 'almost' least common multiples can differ by 5 % of each other.
 * @returns Returns [how many times a needs to be multiplied,
 * how many times b needs to be multiplied] to achieve the 'almost' least common multiples.
 */
export function almostLeastCommonMultiple(a: number, b: number, error: number): [number, number] {
  debugLog(`ALCM: ${a}, ${b}`);
  
  const bigger: number = Math.max(a, b);
  const lower: number = Math.min(a, b);

  let biggerMultiple = bigger;
  while (true) {
    // how many times @lower fits into @biggerMultiple
    const lowerMultiplier = biggerMultiple / lower;

    const lowerMultiplierFloor = Math.floor(lowerMultiplier);
    const lowerMultiplierCeil = Math.ceil(lowerMultiplier);

    if (Math.abs(lower * lowerMultiplierFloor - biggerMultiple) / biggerMultiple <= error) {
      if (a === bigger) {
        return [biggerMultiple / bigger, lowerMultiplierFloor];
      }
      return [lowerMultiplierFloor, biggerMultiple / bigger];
    }

    if (Math.abs(lower * lowerMultiplierCeil - biggerMultiple) / biggerMultiple <= error) {
      if (a === bigger) {
        return [biggerMultiple / bigger, lowerMultiplierCeil];
      }
      return [lowerMultiplierCeil, biggerMultiple / bigger];
    }

    biggerMultiple += bigger;
  }
}

export function debugLog(message: string) {
  if (config.showDebugLogs) {
    console.log(message);
  }
}

export type RawRecipe = {
  type: RecipeTypes,
  time: number,
  inputs: [ResourceTypes, number][],
  outputs: [ResourceTypes, number][],
};

export type ProductivityRecipe = (RecipeTypes|Recipe)|[(RecipeTypes|Recipe), number]

export function createRecipes(rawRecipes: RawRecipe[]): Map<RecipeTypes, Recipe> {
  const recipes: Map<RecipeTypes, Recipe> = new Map();
  rawRecipes.forEach(rawRecipe => {
    recipes.set(rawRecipe.type, new Recipe(
      new ResourceMap(new Map(rawRecipe.inputs)),
      new ResourceMap(new Map(rawRecipe.outputs)),
    ));
  });
  return recipes;
}

function round(number: number) {
    // round the number to the configured number of decimal places
    const roundingMultiplier = Math.pow(10, config.printedResultMaxDecimalPlaces);
    return Math.round((number + Number.EPSILON) * roundingMultiplier) / roundingMultiplier;
}

function printCountLine(label: string, count: number) {
  const rounded = round(count);

  // set the length of the digits section
  const digitsSectionLength = config.printedResultDigitSectionLength;
  const digits = rounded.toString().length;
  
  if (digits >= digitsSectionLength) {
    console.log(`>>> ${label} count too high <<<`);
  }
  else {
    const digitsSectionSpaces = ' '.repeat(digitsSectionLength - digits);
    console.log(`${rounded}${digitsSectionSpaces}${label}`);
  }
}

function getRoundedStackCount(resource: ResourceTypes, count: number): number {
  // the stack size is NaN if it is not defined
  const stackSize = stackSizes.get(resource);
  let roundedStacks = NaN;
  if (stackSize !== undefined) {
    roundedStacks = round(count / stackSize);
  }

  return roundedStacks;
}

/**
 * @param resources The resources to summarize.
 * @returns Returns how many inventory spaces are needed to hold the resources.
 */
export function getRequiredInventorySlots(resources: ResourceMap): number {
  let stackCount = 0;
  for (let [resource, count] of resources.getIterable()) {
    stackCount += Math.ceil(getRoundedStackCount(resource, count));
  }

  return stackCount;
}

export function printCountAndStackLine(resource: ResourceTypes, count: number) {
  const rounded = round(count);
  const roundedStacks = getRoundedStackCount(resource, count);
  const label = ResourceTypes[resource];

  // set the length of the digits section
  const digitsSectionLength = config.printedResultDigitSectionLength;
  // +3 for a space and parentheses
  const digits = rounded.toString().length + roundedStacks.toString().length + 3;
  
  if (digits >= digitsSectionLength) {
    console.log(`>>> ${label} count too high <<<`);
  }
  else {
    const digitsSectionSpaces = ' '.repeat(digitsSectionLength - digits);
    console.log(`${rounded} (${roundedStacks})${digitsSectionSpaces}${label}`);
  }
}

export function getRecipeFromRecipeTypesOrRecipe(recipe: (RecipeTypes|Recipe)): Recipe {
  if (recipe instanceof Recipe) {
    return recipe;
  }

  return getRecipe(recipe);
}

export { config };
