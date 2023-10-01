import { RecipeTypes } from "./data/recipeTypes";
import getRecipe from "./data/recipes";
import { ResourceTypes } from "./data/resourceTypes";

const spaceAndUtilityRecipe = getRecipe(RecipeTypes.UtilitySciencePack)
// join with space science, produce the same amount of both
.joinOnOutput(
  getRecipe(RecipeTypes.SpaceSciencePack),
  ResourceTypes.UtilitySciencePack,
  ResourceTypes.SpaceSciencePack,
)
// apply recipes to get only terrestrial resources
.applyRecipes([
  RecipeTypes.SpaceTransportBelt,
  RecipeTypes.MachineLearningData,
  RecipeTypes.BlankDataCard,
  RecipeTypes.PolishedDataStorageSubstrateWater,
])
//.multiply(350)
//.print();

// format junk data cards
getRecipe(RecipeTypes.DataFormatting)
.applyRecipes([
  spaceAndUtilityRecipe
])
.removeInputs([
  // ignore space liquids
  ResourceTypes.CosmicWater,
  ResourceTypes.CoolThermofluid10,
  // ignore cryonite (already present on orbit)
  ResourceTypes.CryoniteRod,
])
.print();
