import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ApplicationWindow {
    id: root
    width: 1120
    height: 720
    visible: true
    color: "#020617"
    title: "Demiurge Studio — Sovereign Digital Pantheon"

    property int sidebarWidth: 220

    Rectangle {
        anchors.fill: parent
        color: "#020617"

        RowLayout {
            anchors.fill: parent

            // SIDEBAR
            Rectangle {
                Layout.preferredWidth: root.sidebarWidth
                Layout.fillHeight: true
                color: "#020617"
                border.color: "#1e293b"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 16

                    // Logo / Title
                    ColumnLayout {
                        spacing: 4

                        Text {
                            text: "DEMIURGE"
                            font.pixelSize: 18
                            font.bold: true
                            color: "#e2e8f0"
                        }
                        Text {
                            text: "Studio"
                            font.pixelSize: 13
                            color: "#64748b"
                        }
                    }

                    Rectangle {
                        height: 1
                        color: "#1f2937"
                        Layout.fillWidth: true
                    }

                    // Simple Nav placeholders
                    ColumnLayout {
                        spacing: 8

                        Label {
                            text: "Dashboard"
                            color: "#e2e8f0"
                            font.pixelSize: 13
                        }
                        Label {
                            text: "Wallet"
                            color: "#9ca3af"
                            font.pixelSize: 12
                        }
                        Label {
                            text: "Archon"
                            color: "#9ca3af"
                            font.pixelSize: 12
                        }
                        Label {
                            text: "Fabric & Abyss"
                            color: "#9ca3af"
                            font.pixelSize: 12
                        }
                    }

                    Item { Layout.fillHeight: true }

                    Text {
                        text: "RPC: " + rpcClient.rpcUrl
                        color: "#6b7280"
                        font.pixelSize: 10
                        wrapMode: Text.WrapAnywhere
                        Layout.fillWidth: true
                    }
                }
            }

            // MAIN PANEL
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#020617"

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 20
                    spacing: 16

                    // HEADER
                    RowLayout {
                        Layout.fillWidth: true

                        ColumnLayout {
                            spacing: 4
                            Text {
                                text: "Archon Control Room"
                                font.pixelSize: 20
                                font.bold: true
                                color: "#e5e7eb"
                            }
                            Text {
                                text: "Monitor chain health, inspect CGT balances, and track Archon status."
                                font.pixelSize: 12
                                color: "#9ca3af"
                                wrapMode: Text.Wrap
                                Layout.preferredWidth: 520
                            }
                        }

                        Item { Layout.fillWidth: true }

                        Button {
                            text: "Refresh Chain"
                            onClicked: {
                                console.log("Refresh Chain clicked")
                                rpcClient.fetchChainInfo()
                            }
                            width: 120
                            height: 32
                            background: Rectangle {
                                anchors.fill: parent
                                radius: 16
                                color: parent.pressed ? "#0ea5e9" : parent.hovered ? "#38bdf8" : "#22c1e5"
                            }
                            contentItem: Text {
                                text: parent.text
                                color: "#020617"
                                font.pixelSize: 12
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }

                    // TOP ROW: CHAIN STATUS + ARCHON/WALLET
                    RowLayout {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 220
                        spacing: 16

                        // CHAIN STATUS CARD
                        Rectangle {
                            Layout.fillHeight: true
                            Layout.fillWidth: true
                            color: "#020617"
                            radius: 16
                            border.color: "#1f2937"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 10

                                Text {
                                    text: "Chain Status"
                                    font.pixelSize: 14
                                    font.bold: true
                                    color: "#e5e7eb"
                                }

                                Rectangle {
                                    height: 1
                                    color: "#1e293b"
                                    Layout.fillWidth: true
                                }

                                RowLayout {
                                    Layout.fillWidth: true

                                    ColumnLayout {
                                        spacing: 6
                                        Text {
                                            text: "Height"
                                            font.pixelSize: 11
                                            color: "#9ca3af"
                                        }
                                        Text {
                                            id: chainHeightLabel
                                            text: chainHeight >= 0 ? ("#" + chainHeight) : "—"
                                            font.pixelSize: 18
                                            font.family: "JetBrains Mono"
                                            color: chainHeight >= 0 ? "#22c55e" : "#6b7280"
                                        }
                                    }

                                    Item { Layout.fillWidth: true }

                                    ColumnLayout {
                                        spacing: 6
                                        Text {
                                            text: "Node Status"
                                            font.pixelSize: 11
                                            color: "#9ca3af"
                                        }
                                        Rectangle {
                                            radius: 999
                                            color: chainOnline ? "#065f46" : "#4b5563"
                                            implicitHeight: 24
                                            implicitWidth: 110

                                            Row {
                                                anchors.centerIn: parent
                                                spacing: 6

                                                Rectangle {
                                                    width: 8
                                                    height: 8
                                                    radius: 4
                                                    color: chainOnline ? "#22c55e" : "#e5e7eb"
                                                }
                                                Text {
                                                    text: chainOnline ? "ONLINE" : "OFFLINE"
                                                    font.pixelSize: 11
                                                    color: "#e5e7eb"
                                                }
                                            }
                                        }
                                    }
                                }

                                Text {
                                    id: chainErrorText
                                    visible: chainErrorMessage.length > 0
                                    text: chainErrorMessage
                                    font.pixelSize: 11
                                    color: "#f97373"
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                            }
                        }

                        // WALLET + ARCHON CARD
                        Rectangle {
                            Layout.fillHeight: true
                            Layout.fillWidth: true
                            color: "#020617"
                            radius: 16
                            border.color: "#1f2937"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 16
                                spacing: 10

                                Text {
                                    text: "Wallet & Archon Status"
                                    font.pixelSize: 14
                                    font.bold: true
                                    color: "#e5e7eb"
                                }

                                Rectangle {
                                    height: 1
                                    color: "#1e293b"
                                    Layout.fillWidth: true
                                }

                                ColumnLayout {
                                    spacing: 6
                                    Text {
                                        text: "Address (32-byte hex)"
                                        font.pixelSize: 11
                                        color: "#9ca3af"
                                    }
                                    TextField {
                                        id: addressField
                                        placeholderText: "e.g. 0a1b... (64 hex characters)"
                                        font.pixelSize: 12
                                        color: "#e5e7eb"
                                        selectByMouse: true
                                        background: Rectangle {
                                            anchors.fill: parent
                                            radius: 10
                                            color: "#0f172a"
                                            border.color: addressField.activeFocus ? "#22c1e5" : "#1f2937"
                                            border.width: 1
                                        }
                                    }

                                    RowLayout {
                                        spacing: 8

                                        Button {
                                            text: "Load Wallet"
                                            onClicked: {
                                                console.log("Load Wallet clicked, address:", addressField.text)
                                                if (addressField.text.length > 0) {
                                                    rpcClient.fetchBalance(addressField.text)
                                                    rpcClient.fetchIsArchon(addressField.text)
                                                } else {
                                                    walletErrorMessage = "Please enter an address"
                                                }
                                            }
                                            width: 100
                                            height: 28
                                            background: Rectangle {
                                                anchors.fill: parent
                                                radius: 16
                                                color: parent.pressed ? "#0ea5e9" : parent.hovered ? "#38bdf8" : "#22c1e5"
                                            }
                                            contentItem: Text {
                                                text: parent.text
                                                font.pixelSize: 11
                                                font.bold: true
                                                color: "#020617"
                                                horizontalAlignment: Text.AlignHCenter
                                                verticalAlignment: Text.AlignVCenter
                                            }
                                        }

                                        Item { Layout.fillWidth: true }
                                    }
                                }

                                ColumnLayout {
                                    spacing: 4
                                    Text {
                                        text: "CGT Balance"
                                        font.pixelSize: 11
                                        color: "#9ca3af"
                                    }
                                    Text {
                                        id: balanceLabel
                                        text: {
                                            if (currentBalance >= 0) {
                                                return Math.floor(currentBalance) + " CGT"
                                            }
                                            return "—"
                                        }
                                        font.pixelSize: 16
                                        font.family: "JetBrains Mono"
                                        color: "#22c55e"
                                    }
                                }

                                ColumnLayout {
                                    spacing: 4
                                    Text {
                                        text: "Archon Status"
                                        font.pixelSize: 11
                                        color: "#9ca3af"
                                    }
                                    Text {
                                        id: archonLabel
                                        text: archonKnown ? (archonIsTrue ? "ARCHON" : "Nomad") : "—"
                                        font.pixelSize: 14
                                        font.bold: true
                                        color: archonIsTrue ? "#38bdf8" : "#e5e7eb"
                                    }
                                }

                                Text {
                                    id: walletErrorText
                                    visible: walletErrorMessage.length > 0
                                    text: walletErrorMessage
                                    font.pixelSize: 11
                                    color: "#f97373"
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                            }
                        }
                    }

                    // FUTURE AREA: Fabric & Abyss previews
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        radius: 16
                        border.color: "#1f2937"
                        border.width: 1
                        color: "#020617"

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 16
                            spacing: 6

                            Text {
                                text: "Fabric & Abyss Preview"
                                font.pixelSize: 14
                                font.bold: true
                                color: "#e5e7eb"
                            }

                            Text {
                                text: "Upcoming: visualize Fabric roots, Abyss listings, and D-GEN collections minted by Archons in real time."
                                font.pixelSize: 11
                                color: "#9ca3af"
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }
                        }
                    }
                }
            }
        }
    }

    // STATE
    property int chainHeight: -1
    property bool chainOnline: false
    property string chainErrorMessage: ""
    property double currentBalance: -1
    property bool archonKnown: false
    property bool archonIsTrue: false
    property string walletErrorMessage: ""

    Component.onCompleted: {
        console.log("Component completed, fetching chain info...")
        console.log("RPC URL:", rpcClient.rpcUrl)
        rpcClient.fetchChainInfo()
    }

    Connections {
        target: rpcClient

        function onChainInfoUpdated(height) {
            console.log("Chain info updated, height:", height)
            chainHeight = height
            chainOnline = true
            chainErrorMessage = ""
        }

        function onChainInfoError(message) {
            console.log("Chain info error:", message)
            chainOnline = false
            chainErrorMessage = message
        }

        function onBalanceUpdated(addressHex, balance) {
            console.log("Balance updated for", addressHex, ":", balance)
            currentBalance = balance
            walletErrorMessage = ""
        }

        function onBalanceError(message) {
            console.log("Balance error:", message)
            walletErrorMessage = message
        }

        function onArchonStatusUpdated(addressHex, isArchon) {
            console.log("Archon status updated for", addressHex, ":", isArchon)
            archonKnown = true
            archonIsTrue = isArchon
        }

        function onArchonStatusError(message) {
            console.log("Archon status error:", message)
            walletErrorMessage = message
        }
    }
}

