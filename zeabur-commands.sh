#!/bin/bash
zeabur env set DISABLE_DBUS 1
zeabur env set DISABLE_DEV_SHM_USAGE 1
zeabur env set NO_SANDBOX 1
zeabur env set DISABLE_GPU 1
zeabur env set ENABLE_LOG_FILTER 1
zeabur env set NODE_ENV production
zeabur env set BROWSER_HEADLESS true
zeabur env unset DISPLAY
zeabur env unset XVFB_WHD
zeabur env unset DBUS_SESSION_BUS_ADDRESS
zeabur env unset DBUS_SYSTEM_BUS_ADDRESS
