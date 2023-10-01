import { Recipe } from "../recipe";
import { RawRecipe, createRecipes } from "../utilities";
import { RecipeTypes } from "./recipeTypes";
import { ResourceTypes } from "./resourceTypes";

const rawRecipes: RawRecipe[] = [
  {
    type: RecipeTypes.SpaceTransportBelt,
    time: 10,
    inputs: [
      [ResourceTypes.SmallElectricMotor, 2],
      [ResourceTypes.LowDensityStructure, 1],
      [ResourceTypes.SteelPlate, 2],
      [ResourceTypes.Lubricant, 10],
    ],
    outputs: [
      [ResourceTypes.SpaceTransportBelt, 2],
    ],
  },
  {
    type: RecipeTypes.UtilitySciencePack,
    time: 80,
    inputs: [
      [ResourceTypes.ProcessingUnit, 1],
      [ResourceTypes.SpaceTransportBelt, 1],
      [ResourceTypes.EfficiencyModule, 1],
      [ResourceTypes.CryoniteRod, 6],
      [ResourceTypes.MachineLearningData, 4],
      [ResourceTypes.CoolThermofluid10, 20],
    ],
    outputs: [
      [ResourceTypes.UtilitySciencePack, 4],
      [ResourceTypes.JunkDataCard, 4],
      [ResourceTypes.Thermofluid25, 20],
    ],
  },
  {
    type: RecipeTypes.MachineLearningData,
    time: 10,
    inputs: [
      [ResourceTypes.ElectronicCircuit, 2],
      [ResourceTypes.BlankDataCard, 1],
      [ResourceTypes.CoolThermofluid10, 5],
    ],
    outputs: [
      [ResourceTypes.MachineLearningData, 1],
      [ResourceTypes.Scrap, 1],
      [ResourceTypes.Thermofluid25, 5],
    ],
  },
  {
    type: RecipeTypes.BlankDataCard,
    time: 10,
    inputs: [
      [ResourceTypes.AdvancedCircuit, 3],
      [ResourceTypes.CopperPlate, 6],
      [ResourceTypes.PolishedDataStorageSubstrate, 4],
    ],
    outputs: [
      [ResourceTypes.BlankDataCard, 1],
    ],
  },
  {
    type: RecipeTypes.PolishedDataStorageSubstrateWater,
    time: 2.5,
    inputs: [
      [ResourceTypes.RoughDataStorageSubstrate, 1],
      [ResourceTypes.CosmicWater, 5],
    ],
    outputs: [
      [ResourceTypes.PolishedDataStorageSubstrate, 1],
      [ResourceTypes.Scrap, 0.01],
      [ResourceTypes.ContaminatedCosmicWater, 5],
    ],
  },
  {
    type: RecipeTypes.PolishedDataStorageSubstrateGel,
    time: 2.5,
    inputs: [
      [ResourceTypes.RoughDataStorageSubstrate, 1],
      [ResourceTypes.ChemicalGel, 5],
    ],
    outputs: [
      [ResourceTypes.PolishedDataStorageSubstrate, 1],
    ],
  },
  {
    type: RecipeTypes.DataFormatting,
    time: 1.5,
    inputs: [
      [ResourceTypes.JunkDataCard, 1],
      [ResourceTypes.CoolThermofluid10, 1],
    ],
    outputs: [
      [ResourceTypes.BlankDataCard, 0.7],
      [ResourceTypes.Scrap, 0.29],
      [ResourceTypes.Thermofluid25, 1],
    ],
  },
  {
    type: RecipeTypes.CosmicWaterDecontamination,
    time: 5,
    inputs: [
      [ResourceTypes.ContaminatedCosmicWater, 100],
    ],
    outputs: [
      [ResourceTypes.ContaminatedScrap, 0.01],
      [ResourceTypes.CosmicWater, 99],
      [ResourceTypes.ContaminatedBiosludge, 1],
    ],
  },
  {
    type: RecipeTypes.SpaceSciencePack,
    time: 75,
    inputs: [
      [ResourceTypes.ProcessingUnit, 1],
      [ResourceTypes.SpaceTransportBelt, 2],
      [ResourceTypes.SolidRocketFuel, 1],
      [ResourceTypes.Stone, 5],
      [ResourceTypes.CosmicWater, 1],
    ],
    outputs: [
      [ResourceTypes.SpaceSciencePack, 5],
    ],
  },
];

const recipes: Map<RecipeTypes, Recipe> = createRecipes(rawRecipes);

export default function getRecipe(recipeType: RecipeTypes): Recipe {
  return recipes.get(recipeType)!.clone();
}
