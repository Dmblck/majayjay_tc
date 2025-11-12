<?php
header("Content-Type: application/json");
session_start();

$conn = new mysqli("localhost", "root", "", "majayjay_tourism");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $username = $input['username'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $confirm_password = $input['confirm_password'] ?? '';

    if ($password !== $confirm_password) {
        echo json_encode(["success" => false, "message" => "Passwords do not match"]);
        exit();
    }

    // check if username/email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Username or email already exists"]);
        exit();
    }

    // hash password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // insert new user
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')");
    $stmt->bind_param("sss", $username, $email, $hashed_password);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Account created successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Signup failed"]);
    }
}
?>
