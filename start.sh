#!/bin/bash
# Start both Apache and the Java FastCGI server
# CHANGE THESE:
APACHE_PORT=18080
FCGI_PORT=18081

echo "=== Starting Java FastCGI server on port $FCGI_PORT ==="
FCGI_PORT=$FCGI_PORT java -cp server/out:server/lib/fastcgi-lib.jar Main &
JAVA_PID=$!
echo "Java PID: $JAVA_PID"

sleep 1

echo "=== Starting Apache on port $APACHE_PORT ==="
httpd -f "$HOME/lab2/httpd.conf"

echo ""
echo "Running! Open: http://localhost:$APACHE_PORT/"
echo ""
echo "To stop:"
echo "  kill $JAVA_PID"
echo "  httpd -f $HOME/lab2/httpd.conf -k stop"
