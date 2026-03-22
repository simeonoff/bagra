import { BUILTIN_DIRECTIVES } from '@/core/directives';
import { BUILTIN_PREDICATES } from '@/core/predicates';
import type {
  DirectiveHandler,
  DirectiveRegistry,
  PredicateHandler,
  PredicateRegistry,
  QueryRegistries,
} from '@/types';

/**
 * Create predicate and directive registries pre-populated with built-ins.
 *
 * @param custom - Optional user-defined handlers to merge in.
 *   These override built-ins with the same operator name.
 */
export function createRegistries(custom?: {
  predicates?: Record<string, PredicateHandler>;
  directives?: Record<string, DirectiveHandler>;
}): QueryRegistries {
  const predicates: PredicateRegistry = new Map(BUILTIN_PREDICATES);
  const directives: DirectiveRegistry = new Map(BUILTIN_DIRECTIVES);

  if (custom?.predicates) {
    for (const [name, handler] of Object.entries(custom.predicates)) {
      predicates.set(name, handler);
    }
  }

  if (custom?.directives) {
    for (const [name, handler] of Object.entries(custom.directives)) {
      directives.set(name, handler);
    }
  }

  return { predicates, directives };
}
