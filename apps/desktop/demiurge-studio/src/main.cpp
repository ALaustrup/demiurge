#include <QGuiApplication>
#include <QCoreApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QUrl>
#include <QDebug>
#include <QDir>
#include <QFile>

#include "rpcclient.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);

    QQmlApplicationEngine engine;

    RpcClient rpcClient;
    engine.rootContext()->setContextProperty("rpcClient", &rpcClient);

    // Try loading from resource first, then fallback to file system
    QStringList resourcePaths = {
        "qrc:/qt/qml/DemiurgeStudio/main.qml",
        "qrc:/DemiurgeStudio/main.qml",
        "qrc:/main.qml"
    };
    
    QUrl url;
    bool loaded = false;
    
    // Try resource paths first
    for (const QString &path : resourcePaths) {
        url = QUrl(path);
        qDebug() << "Trying resource path:" << url;
        engine.load(url);
        if (!engine.rootObjects().isEmpty()) {
            qDebug() << "Successfully loaded from resource:" << url;
            loaded = true;
            break;
        }
        engine.clearComponentCache();
    }
    
    // Fallback to file system - try build directory first, then source directory
    if (!loaded) {
        QDir buildDir(QCoreApplication::applicationDirPath());
        QString buildPath = buildDir.absoluteFilePath("qml/main.qml");
        if (QFile::exists(buildPath)) {
            url = QUrl::fromLocalFile(buildPath);
            qDebug() << "Trying file system path (build):" << url;
            engine.load(url);
            if (!engine.rootObjects().isEmpty()) {
                qDebug() << "Successfully loaded from file system (build):" << url;
                loaded = true;
            }
        }
        
        if (!loaded) {
            buildDir.cdUp(); // Go up from build/ to demiurge-studio/
            QString sourcePath = buildDir.absoluteFilePath("qml/main.qml");
            if (QFile::exists(sourcePath)) {
                url = QUrl::fromLocalFile(sourcePath);
                qDebug() << "Trying file system path (source):" << url;
                engine.load(url);
                if (!engine.rootObjects().isEmpty()) {
                    qDebug() << "Successfully loaded from file system (source):" << url;
                    loaded = true;
                }
            }
        }
    }
    
    if (!loaded) {
        qWarning() << "Failed to load QML from any path";
        qWarning() << "Tried resource paths:" << resourcePaths;
        qWarning() << "Tried file system path:" << url;
        return -1;
    }
    
    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreated,
        &app,
        [url](QObject *obj, const QUrl &objUrl) {
            if (!obj && url == objUrl) {
                qWarning() << "Failed to create QML object from:" << objUrl;
                QCoreApplication::exit(-1);
            }
        },
        Qt::QueuedConnection);

    return app.exec();
}
