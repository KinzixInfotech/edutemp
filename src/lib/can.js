import { permissions } from '@/data/permission';

export function can(role, action) {
    return permissions[role]?.[action] === true;
}
