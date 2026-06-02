#!/bin/bash
set -e

git push origin main
ssh root@172.236.21.178 'bash ~/nitpickr_deploy_changes.sh'
