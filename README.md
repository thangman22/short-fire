# 🔥Firelink
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
 | `fire-link init`                   | Initial Firelink for create configulation.
 | `fire-link create [url] <slug> `   | Create shorten URL defind slug is optional.
 | `fire-link list <q>`               | List all available URL. defind q for searching.
 | `fire-link dump`                   | Dump Firebase configulation for backup purpose.
 | `fire-link restore <file>`         | Restore configulation from file.
 | `fire-link delete [slug]`          | Delete URL by specific slug.
