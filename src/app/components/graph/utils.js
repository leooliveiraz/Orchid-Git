import { LANE_WIDTH } from "./constants.js";

export function LANE_CENTER_X(lane) {
  return lane * LANE_WIDTH + LANE_WIDTH / 2;
}

export function LANE_LINE_X(lane) {
  return lane * LANE_WIDTH + LANE_WIDTH / 2 - 1;
}
