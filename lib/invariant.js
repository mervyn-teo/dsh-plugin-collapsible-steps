const PACKAGE_NAME = "dsh-plugin-collapsible-steps";
const name = "collapsible-steps-invariant";
const inject = ["invariants"];
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));

export { apply, inject, name };
