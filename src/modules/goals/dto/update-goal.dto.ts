import { PartialType } from "@nestjs/mapped-types";

import { CreateGoalDto } from "./create-goal.dto";

/**
 * When sent, `areaIds` replaces the goal's whole set of areas.
 * Omitting it keeps the current areas; sending `[]` removes them all.
 */
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
