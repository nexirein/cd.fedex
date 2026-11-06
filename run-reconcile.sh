#!/bin/bash
cd "/Users/bipulsikder16/Developer/FedEx powerapp"
pwsh -NoLogo -ExecutionPolicy Bypass -File ./tools/00-Reconcile-SharePoint.ps1 "$@"
