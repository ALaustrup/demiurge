cmake_minimum_required(VERSION 3.21)

project(demiurge-studio LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Quick Network)

qt_standard_project_setup()

set(SOURCES
    src/main.cpp
    src/rpcclient.cpp
    src/rpcclient.h
)

qt_add_executable(demiurge-studio
    MANUAL_FINALIZATION
    ${SOURCES}
)

qt_add_qml_module(demiurge-studio
    URI DemiurgeStudio
    VERSION 1.0
    QML_FILES
        qml/main.qml
)

target_link_libraries(demiurge-studio
    PRIVATE
        Qt6::Quick
        Qt6::Network
)

install(TARGETS demiurge-studio
    BUNDLE DESTINATION .
    RUNTIME DESTINATION .
)

qt_finalize_executable(demiurge-studio)

# Copy QML file to build directory for file system fallback
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/qml/main.qml
     DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/qml
)
