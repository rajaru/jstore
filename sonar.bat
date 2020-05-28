echo node_modules\ > z:\exclude.txt
xcopy /s C:\ganesh\git\jstore z:\jstore /i /y /EXCLUDE:z:\exclude.txt
z:
cd z:\jstore
powershell -Command "(gc Z:\jstore\coverage\lcov.info) -replace 'SF:src', 'SF:z:\jstore\src' | Out-File -encoding ASCII Z:\jstore\coverage\lcov.info"

C:\tools\sonarqube-7.7\sonar-scanner-3.3.0.1492-windows\bin\sonar-scanner.bat -D"sonar.projectKey=JStore" -D"sonar.sources=." -D"sonar.host.url=http://127.0.0.1:9000" -D"sonar.login=a98d6e5879163a692871ef5d6a47037e92771518" 
pause