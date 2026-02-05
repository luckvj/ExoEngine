<?php
/**
 * dim-proxy.php - Fallback Version (No cURL required)
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$shareId = $_GET['shareId'] ?? '';
if (!$shareId || !preg_match('/^[a-z0-9]+$/i', $shareId)) {
    die(json_encode(['error' => 'Invalid shareId']));
}

$url = "https://api.destinyitemmanager.com/loadout_share?shareId=" . $shareId;

// Use file_get_contents as a fallback for when cURL is disabled
$options = [
    'http' => [
        'method' => 'GET',
        'header' => "User-Agent: ExoEngine-Proxy/1.0\r\n" .
                    "Accept: application/json\r\n",
        'timeout' => 20,
        'ignore_errors' => true
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false
    ]
];

$context = stream_context_create($options);
$response = @file_get_contents($url, false, $context);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Server failed to fetch DIM data. (Stream failed واله)']);
} else {
    // Forward the status code if possible
    if (isset($http_response_header)) {
        preg_match('{HTTP/\S*\s(\d{3})}', $http_response_header[0], $matches);
        if (isset($matches[1])) {
            http_response_code(intval($matches[1]));
        }
    }
    echo $response;
}

