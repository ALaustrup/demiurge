#pragma once

#include <QObject>
#include <QNetworkAccessManager>
#include <QUrl>
#include <functional>

class RpcClient : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString rpcUrl READ rpcUrl WRITE setRpcUrl NOTIFY rpcUrlChanged)

public:
    explicit RpcClient(QObject* parent = nullptr);

    QString rpcUrl() const;
    void setRpcUrl(const QString& url);

    Q_INVOKABLE void fetchChainInfo();
    Q_INVOKABLE void fetchBalance(const QString& addressHex);
    Q_INVOKABLE void fetchIsArchon(const QString& addressHex);

signals:
    void rpcUrlChanged();
    void chainInfoUpdated(qint64 height);
    void chainInfoError(const QString& message);

    void balanceUpdated(const QString& addressHex, quint64 balance);
    void balanceError(const QString& message);

    void archonStatusUpdated(const QString& addressHex, bool isArchon);
    void archonStatusError(const QString& message);

private:
    QNetworkAccessManager m_manager;
    QString m_rpcUrl;

    void sendJsonRpc(
        const QString& method,
        const QJsonValue& params,
        std::function<void(const QJsonObject&)> onSuccess,
        std::function<void(const QString&)> onError
    );
};

