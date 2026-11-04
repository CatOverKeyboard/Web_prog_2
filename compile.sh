#!/bin/bash
# Compile the Java FastCGI server
# Run this from the lab2 directory

echo "Compiling..."
mkdir -p server/out
javac -cp server/lib/fastcgi-lib.jar \
      server/src/Main.java \
      -d server/out

if [ $? -eq 0 ]; then
    echo "OK! Compiled to server/out/"
    echo ""
    echo "To run the FastCGI server:"
    echo "  FCGI_PORT=18081 java -cp server/out:server/lib/fastcgi-lib.jar Main"
    echo ""
    echo "To start Apache:"
    echo "  httpd -f /home/\$USER/lab2/httpd.conf"
else
    echo "Compilation failed!"
fi
