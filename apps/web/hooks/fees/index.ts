/**
 * Fee read + write hooks (task F-5.1). Reads back the paginated fee-structure
 * list; writes create/update/delete and invalidate the `["fee-structures"]`
 * cache key.
 */

export {
  useFeeStructures,
  FEE_STRUCTURES_PER_PAGE,
} from "./use-fee-structures"
export {
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useDeleteFeeStructure,
} from "./use-fee-structure-mutations"
