## Summary

<!-- What does this change and why? One or two sentences. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Hardware / collector support
- [ ] Refactor (no behaviour change)
- [ ] Documentation
- [ ] Build or CI

## Testing

<!--
How did you verify this? Include the machine you tested on when the change
touches a collector or the 3D scene — CPU, distro, kernel.
-->

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] Verified in the browser

## Checklist

- [ ] New user-visible strings are added for **both** `en` and `zh` in `src/i18n/`
- [ ] New hardware fields are nullable and degrade gracefully on non-Linux platforms
- [ ] No serial numbers, MAC addresses, IP addresses, or UUIDs are collected
- [ ] Layer boundaries are respected (nothing outside `src/app` and `src/server` imports `src/server/**`)
- [ ] Documentation updated if behaviour or structure changed

## Related issues

<!-- Closes #123 -->
