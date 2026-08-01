# 🔥Short fire
Self-hosted shortened URL genarator for Firebase hosting

## Problem
Hosted link shorteners such as Bit.ly and Rebrandly charge a monthly fee for a
custom domain. For personal use that is an expensive way to serve a few hundred
`302`s a month.

## Solution
Firebase Hosting serves redirects, a custom domain and a managed SSL
certificate on the free Spark plan. Short fire keeps your link list on your
machine, renders it into `firebase.json`, and deploys it.

## What it costs
Everything below stays inside the Firebase **Spark (free)** plan:

| | Spark free allowance |
| :-- | :-- |
| Hosting storage | 10 GB |
| Hosting transfer | 360 MB/day |
| Custom domain + SSL | included |
| Deploys | unmetered |

A short link is a few hundred bytes of config plus two small HTML pages, so a
personal shortener will not get close to those limits. **No credit card and no
Blaze upgrade are required.**

> Short fire 1.x optionally backed the config up to Cloud Storage. Cloud Storage
> now requires the paid Blaze plan, so 2.x drops that in favour of
> `short-fire pull`, which reads the live link list back from Hosting for free.

## Limitations
- No click analytics. This is the one thing a paid shortener gives you that
  Firebase Hosting alone does not.
- Every new link redeploys the site, which takes a few seconds.
- The link list lives in your local config. Back it up with `short-fire dump`,
  or recover it from Firebase with `short-fire pull`.

## Pre-requisites
- Node.js 20.19 or newer
- A Firebase project with Hosting enabled

## Installation

``` npm install -g short-fire ```

## Setup

### 1. Create a service account

`firebase login:ci` tokens are deprecated in `firebase-tools` and warn on every
deploy, so Short fire authenticates with a service account instead.

1. Open the [Google Cloud service accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts)
   for your Firebase project and create a service account.
2. Grant it the **Firebase Hosting Admin** (`roles/firebasehosting.admin`) role.
3. Create a JSON key and save it somewhere private, e.g. `~/.short-fire-key.json`.

The key file never leaves your machine — Short fire only stores its path.

### 2. Point your domain at Firebase

Add your custom domain under **Hosting → Add custom domain** in the Firebase
console and follow the DNS instructions. SSL is provisioned automatically.

### 3. Initialise

```
short-fire init
```

## How to
 | Command                | Description |
 | :--------------------- |:-------------|
 | `short-fire init`                   | Initialize short-fire for create configuration.
 | `short-fire create [url] <slug> `   | Create shortened URL. Option slug is optional.
 | `short-fire list <q>`               | List all available URLs. Use option q for searching.
 | `short-fire dump`                   | Dump the link list for backup purpose.
 | `short-fire restore [file]`         | Restore the link list from a file.
 | `short-fire pull`                   | Re-read the live link list from Firebase Hosting.
 | `short-fire delete [slug]`          | Delete URL by specifying slug.
 | `short-fire where`                  | Show where the config and deploy workspace live.

Useful options:

- `-n`, `--new` on `create` forces a fresh slug even when the destination
  already has one.
- `--dry-run` on any deploying command builds the Firebase workspace without
  publishing it.

## Moving to another machine
Install Short fire, copy your service account key over, run `short-fire init`
with the same project and domain, then:

```
short-fire pull
```

This reads the redirects out of your latest Hosting release, so nothing needs to
have been backed up by hand.

## Upgrading from 1.x
Run `short-fire list` once after upgrading. Your existing config is migrated in
place, so links created with 1.x carry over.

Two things change:

- The deploy workspace moves out of the package directory into your config
  directory (`short-fire where` prints it), so a global install no longer writes
  inside `node_modules`.
- Deploys prefer the service account. An existing `firebase login:ci` token
  keeps working until you re-run `short-fire init`, but it is deprecated
  upstream and will stop working eventually.
