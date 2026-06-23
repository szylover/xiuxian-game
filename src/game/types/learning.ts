export type ScrollStudyType = 'technique' | 'divineArt' | 'recipe' | 'smithingRecipe';

export interface ActiveStudy {
  scrollItemId: string;
  scrollType: ScrollStudyType;
  targetId: string;
  targetName: string;
  progressMonths: number;
  totalMonths: number;
}

export interface LearningSystemState {
  activeStudy: ActiveStudy | null;
  learnedRecipes: string[];
  learnedSmithingRecipes: string[];
  migrationVersion: number;
}
