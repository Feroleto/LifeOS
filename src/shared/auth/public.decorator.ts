import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "lifeos:isPublic";

/**
 * Marks a route as reachable without the user identification header.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
