mkdir -p Iris.AppDir/usr/bin
mkdir -p Iris.AppDir/usr/share/applications
mkdir -p Iris.AppDir/usr/share/icons/hicolor/512x512/apps

# Copy your app
cp -r out/Iris-linux-x64/* Iris.AppDir/usr/bin/

# Create desktop file
cat > Iris.AppDir/iris.desktop << EOF
[Desktop Entry]
Name=Iris
Exec=iris
Icon=iris
Type=Application
Categories=Utility;
EOF

# Copy desktop file to required location
cp Iris.AppDir/iris.desktop Iris.AppDir/usr/share/applications/

# Copy icon
cp src/assets/icons/Iris.png Iris.AppDir/iris.png
cp src/assets/icons/Iris.png Iris.AppDir/usr/share/icons/hicolor/512x512/apps/iris.png

# Make AppRun executable link
ln -sf usr/bin/iris Iris.AppDir/AppRun

ARCH=x86_64 appimagetool Iris.AppDir Iris-x86_64.AppImage
ARCH=i386 appimagetool Iris.AppDir Iris-i386.AppImage

mv Iris-x86_64.AppImage ./out/Iris-x86_64.AppImage
mv Iris-i386.AppImage ./out/Iris-i386.AppImage

