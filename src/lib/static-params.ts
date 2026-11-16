import { companyIds, contras } from '@/data/demo-case';

/** Demo entities are prerendered; live company numbers render on demand in the server build. */
export const entityParams = () => companyIds.map((id) => ({ id }));
export const contraParams = () => contras.map((c) => ({ id: c.entityId, cid: c.id }));
