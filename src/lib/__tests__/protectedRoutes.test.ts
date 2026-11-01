import fs from 'fs';
import path from 'path';
import { SIGNED_IN_ROUTES } from '../protectedRoutes';

const APP = path.join(__dirname, '../../app');

/** The root-stack routes, treating a group folder such as (tabs) as one route with its own layout. */
function routes(dir = APP, prefix = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name.startsWith('(') ? [e.name] : routes(path.join(dir, e.name), `${prefix}${e.name}/`);
    return e.name === '_layout.tsx' ? [] : [`${prefix}${e.name.replace(/\.tsx?$/, '')}`];
  });
}

describe('signed-in routes', () => {
  it('protects every route except sign-in and the start route', () => {
    const open = ['(auth)', 'index'];
    expect([...SIGNED_IN_ROUTES].sort()).toEqual(routes().filter((r) => !open.includes(r)).sort());
  });
});
