import { RecipeTypes } from "./data/recipeTypes";
import getRecipe from "./data/recipes";
import { ResourceTypes } from "./data/resourceTypes";

const spaceAndUtilityRecipe = getRecipe(RecipeTypes.UtilitySciencePack)
// apply recipes to get only terrestrial resources
.applyProducerRecipes([
  RecipeTypes.MachineLearningData,
  RecipeTypes.BlankDataCard,
  RecipeTypes.PolishedDataStorageSubstrateWater,
])
// multiply to get around 400 stacks in total
.multiply(180)
// convert junk data cards to utility science packs
.applyCyclicConsumerRecipes([
  [RecipeTypes.DataFormatting, ResourceTypes.JunkDataCard],
  [RecipeTypes.MachineLearningData, ResourceTypes.BlankDataCard],
  [RecipeTypes.UtilitySciencePack, ResourceTypes.MachineLearningData],
])
// join with space science, produce the same amount of both
.joinOnOutputNoScaling(
  getRecipe(RecipeTypes.SpaceSciencePack),
  ResourceTypes.UtilitySciencePack,
  ResourceTypes.SpaceSciencePack,
)
// apply space transport belt recipe
.applyProducerRecipesNoScaling([
  RecipeTypes.SpaceTransportBelt,
])
.removeInputs([
  // remove leftover space belts
  ResourceTypes.SpaceTransportBelt,
  // remove non terrestrial liquids
  ResourceTypes.CoolThermofluid10,
  ResourceTypes.CosmicWater,
  // remove cryonite rods (already in orbit)
  ResourceTypes.CryoniteRod,
])
.print();
