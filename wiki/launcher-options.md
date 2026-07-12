# Launcher Options

*Only the super admin sees this page, under Host Controls in the sidebar.*

This page controls the extra startup flags Palworld's server is launched with.

![Full Launcher Options page](../images/wiki/launcher-options-01-overview.png)

## How do I turn on performance flags?

Flip the toggles for the performance options (`-useperfthreads`, `-NoAsyncLoadingThread`, `-UseMultithreadForDS`) if your server is struggling with performance.

![Performance flag toggles](../images/wiki/launcher-options-02-performance.png)

## How do I make my server show up in Palworld's public server list?

Turn on the **Community Server** toggle (`-publiclobby`).

![Community Server toggle](../images/wiki/launcher-options-03-community.png)

## How do I use a separate query port?

Turn on **Query Port**, then set a port number. Only do this if you specifically need it - it defaults to off, and AutoPalExpress keeps it separate from your game port automatically to avoid a known conflict.

![Query Port toggle and input](../images/wiki/launcher-options-04-query-port.png)

## How do I override my public IP or port for the community list?

Turn on the override toggles here - the actual values still come from [Super Admin](super-admin.md), so you only ever set the real IP/port in one place.

![Public IP/Port override toggles](../images/wiki/launcher-options-05-overrides.png)

> Restart the server after changing anything on this page - launch options only apply on the next start.
