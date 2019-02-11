# 🔥Short fire
Self hosted shorten URL genarator for Firebase hosting

## Problem
Current shorten URL service such as Bit.ly not support free of charge custom domain support. It make user need to pay expensive fee to personal use.

## Solution
Firebase hosting is support re-direct URL to another domain without charge any cent. 

## Limitation
- No analytics provide.
- No remote database provide please backup configulation frequently.

## Pre-require
- NPM or Yarn

## how to
 | Command                | Desciption
 | :--------------------- |:-------------|
 | `short-fire init`                   | Initial short-fire for create configulation.
 | `short-fire create [url] <slug> `   | Create shorten URL defind slug is optional.
 | `short-fire list <q>`               | List all available URL. defind q for searching.
 | `short-fire dump`                   | Dump Firebase configulation for backup purpose.
 | `short-fire restore <file>`         | Restore configulation from file.
 | `short-fire delete [slug]`          | Delete URL by specific slug.
