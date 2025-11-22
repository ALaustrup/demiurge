#include "rpcclient.h"

#include <QCoreApplication>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>

RpcClient::RpcClient(QObject* parent)
    : QObject(parent)
{
    // Read RPC URL from env or fallback
    const QByteArray env = qgetenv("DEMIURGE_RPC_URL");
    if (!env.isEmpty()) {
        m_rpcUrl = QString::fromUtf8(env);
    } else {
        m_rpcUrl = QStringLiteral("http://127.0.0.1:8545/rpc");
    }
}

QString RpcClient::rpcUrl() const
{
    return m_rpcUrl;
}

void RpcClient::setRpcUrl(const QString& url)
{
    if (m_rpcUrl == url)
        return;

    m_rpcUrl = url;
    emit rpcUrlChanged();
}

void RpcClient::sendJsonRpc(
    const QString& method,
    const QJsonValue& params,
    std::function<void(const QJsonObject&)> onSuccess,
    std::function<void(const QString&)> onError
) {
    QUrl url(m_rpcUrl);
    QNetworkRequest req(url);
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

    QJsonObject body;
    body["jsonrpc"] = QStringLiteral("2.0");
    body["method"] = method;
    body["params"] = params;
    body["id"] = 1;

    const QJsonDocument doc(body);
    QByteArray payload = doc.toJson(QJsonDocument::Compact);

    QNetworkReply* reply = m_manager.post(req, payload);
    QObject::connect(reply, &QNetworkReply::finished, this, [reply, onSuccess, onError]() {
        reply->deleteLater();

        if (reply->error() != QNetworkReply::NoError) {
            onError(QStringLiteral("Network error: %1").arg(reply->errorString()));
            return;
        }

        const QByteArray data = reply->readAll();
        const QJsonDocument respDoc = QJsonDocument::fromJson(data);
        if (!respDoc.isObject()) {
            onError(QStringLiteral("Invalid JSON-RPC response"));
            return;
        }

        const QJsonObject obj = respDoc.object();
        if (obj.contains("error") && obj["error"].isObject()) {
            const QJsonObject err = obj["error"].toObject();
            const QString msg = err.value("message").toString(QStringLiteral("Unknown error"));
            onError(QStringLiteral("RPC error: %1").arg(msg));
            return;
        }

        if (!obj.contains("result")) {
            onError(QStringLiteral("JSON-RPC: no 'result' field"));
            return;
        }

        const QJsonValue resultVal = obj.value("result");
        if (!resultVal.isObject()) {
            // Many of our methods return simple object or primitive; if primitive, wrap.
            QJsonObject wrapper;
            wrapper["value"] = resultVal;
            onSuccess(wrapper);
            return;
        }

        onSuccess(resultVal.toObject());
    });
}

void RpcClient::fetchChainInfo()
{
    sendJsonRpc(
        QStringLiteral("cgt_getChainInfo"),
        QJsonValue(), // null params
        [this](const QJsonObject& result) {
            const qint64 height = result.value("height").toInteger(0);
            emit chainInfoUpdated(height);
        },
        [this](const QString& msg) {
            emit chainInfoError(msg);
        }
    );
}

void RpcClient::fetchBalance(const QString& addressHex)
{
    QJsonObject params;
    params["address"] = addressHex;

    sendJsonRpc(
        QStringLiteral("cgt_getBalance"),
        params,
        [this, addressHex](const QJsonObject& result) {
            const QJsonValue val = result.value("balance");
            quint64 balance = 0;
            if (val.isDouble()) {
                balance = static_cast<quint64>(val.toDouble());
            } else if (val.isString()) {
                bool ok = false;
                balance = val.toString().toULongLong(&ok);
            }
            emit balanceUpdated(addressHex, balance);
        },
        [this](const QString& msg) {
            emit balanceError(msg);
        }
    );
}

void RpcClient::fetchIsArchon(const QString& addressHex)
{
    QJsonObject params;
    params["address"] = addressHex;

    sendJsonRpc(
        QStringLiteral("cgt_isArchon"),
        params,
        [this, addressHex](const QJsonObject& result) {
            bool isArchon = result.value("is_archon").toBool(false);
            emit archonStatusUpdated(addressHex, isArchon);
        },
        [this](const QString& msg) {
            emit archonStatusError(msg);
        }
    );
}

