# 🔥Short fire (Beta)
Self-hosted shortened URL genarator for Firebase hosting

## Problem
Current shortened URL services such as Bit.ly do not support free of charge custom domain support. It makes user need to pay expensive fee for personal use.

## Solution
Firebase hosting supports re-directing URL to another domain without charge any cent. 

## Limitations
- No analytics provided.
- No remote database provided, please backup configuration frequently.

## Pre-requisites
- NPM or Yarn

## How to
 | Command                | Description |
 | :--------------------- |:-------------|
 | `short-fire init`                   | Initialize short-fire for create configuration.
 | `short-fire create [url] <slug> `   | Create shortened URL. Option slug is optional.
 | `short-fire list <q>`               | List all available URLs. Use option q for searching.
 | `short-fire dump`                   | Dump Firebase configuration for backup purpose.
 | `short-fire restore <file>`         | Restore configuration from file.
 | `short-fire delete [slug]`          | Delete URL by specifying slug.
