import { assert } from "console";
import getRecipe from "../data/recipes";
import { RecipeTypes } from "../data/recipeTypes";
import { ResourceTypes } from "../data/resourceTypes";
import { ResourceMap } from "../resourceMap";

const testFunctions: (() => void)[] = [];

testFunctions.push(() => {
  const copperWireProductivity = 2;
  const electronicCircuitProductivity = 2;

  const electronicCircuitRecipe = getRecipe(RecipeTypes.ElectronicCircuitWood)
  .applyProducerRecipes([
    [RecipeTypes.CopperWire, copperWireProductivity],
  ])
  .applyProductivity(electronicCircuitProductivity);
  
  const production = electronicCircuitRecipe.outputs.resourceCount(ResourceTypes.ElectronicCircuit);

  const expectedInputs = new ResourceMap(new Map([
    [ResourceTypes.Wood, production / electronicCircuitProductivity],
    [ResourceTypes.CopperPlate, production / electronicCircuitProductivity * 3 / copperWireProductivity / 2],
  ]));
  
  electronicCircuitRecipe.inputs.equalsVerbose(expectedInputs);
});

testFunctions.forEach(test => test());
