#!/bin/bash

mongodump --db grmble

duplicity --full-if-older-than 30D ./dump s3+http://com.grmble.mongo