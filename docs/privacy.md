---
title: Privacy Policy
---

# OpenClaw Privacy Policy

_Last updated: February 26, 2026_

## Overview

OpenClaw is an open-source AI gateway companion application. This privacy policy describes how the OpenClaw iOS app handles your data.

## Data Collection

OpenClaw does **not** collect, store, or transmit personal data to external servers operated by OpenClaw. All communication occurs directly between your device and your self-hosted OpenClaw gateway.

### Data Processed Locally

The following data is processed on your device and transmitted only to your own gateway:

- **Camera and Microphone**: Photos, video clips, and audio are captured only when explicitly requested through the gateway. Media is sent directly to your gateway and is not stored by OpenClaw.
- **Location**: Your location is shared with your gateway only when you grant permission. Location data is used for automations you configure and is not stored by OpenClaw.
- **Contacts, Calendar, and Reminders**: Accessed only when explicitly requested through the gateway. This data is sent directly to your gateway and is not retained by the app.
- **Speech Recognition**: Voice wake uses on-device speech recognition. Audio is processed locally and is not sent to external services.

### Network Communication

- The app communicates exclusively with your self-hosted OpenClaw gateway over WebSocket.
- Gateway discovery uses Bonjour (local network) or Tailnet (VPN). No data is sent to third-party discovery services.
- Push notifications use Apple Push Notification service (APNs). Only device tokens are shared with your gateway for notification delivery.

## Data Storage

- Pairing credentials are stored in the iOS Keychain.
- No user data is stored in external databases or cloud services by OpenClaw.
- Session data remains on your device and your gateway.

## Third-Party Services

OpenClaw does not integrate with third-party analytics, advertising, or tracking services. The only external service used is Apple Push Notification service (APNs) for delivering notifications from your gateway.

## Data Sharing

OpenClaw does not sell, share, or transfer your personal data to third parties.

## Children

OpenClaw does not knowingly collect data from children under 13. The app requires a self-hosted gateway to function, which is typically set up by adults.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted to this page and reflected in the app's App Store listing.

## Contact

For questions about this privacy policy, please open an issue at [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw) or visit [https://openclaw.ai](https://openclaw.ai).
