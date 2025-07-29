#!/bin/bash

# Setup script for automated nginx proxy with SSL

# Create required directories
mkdir -p certs
mkdir -p vhost
mkdir -p html
mkdir -p acme
chmod 755 certs vhost html acme