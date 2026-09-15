class IncidentModel {
  final String id;
  final String referenceNumber;
  final String incidentType;
  final String status;
  final String? description;
  final String? address;
  final double lat;
  final double lng;
  final bool isEmergency;
  final DateTime createdAt;
  final DateTime? resolvedAt;
  final String? resolutionNotes;
  final String? reporterName;
  final String? reporterPhone;
  final String? photoUrl;
  final List<String> attachmentUrls;

  IncidentModel({
    required this.id,
    required this.referenceNumber,
    required this.incidentType,
    required this.status,
    this.description,
    this.address,
    required this.lat,
    required this.lng,
    required this.isEmergency,
    required this.createdAt,
    this.resolvedAt,
    this.resolutionNotes,
    this.reporterName,
    this.reporterPhone,
    this.photoUrl,
    this.attachmentUrls = const [],
  });

  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    List<String> urls = [];
    if (json['attachments'] != null && json['attachments'] is List) {
      for (var a in json['attachments']) {
        if (a is Map && a['url'] != null) {
          urls.add(a['url'].toString());
        }
      }
    }

    return IncidentModel(
      id: json['id']?.toString() ?? '',
      referenceNumber: json['reference_number']?.toString() ?? 'BCC-REF',
      incidentType: json['incident_type']?.toString() ?? 'Other',
      status: json['status']?.toString() ?? 'New',
      description: json['description']?.toString(),
      address: json['address']?.toString(),
      lat: (json['lat'] is num) ? (json['lat'] as num).toDouble() : -20.1500,
      lng: (json['lng'] is num) ? (json['lng'] as num).toDouble() : 28.5800,
      isEmergency: json['is_emergency'] == true,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      resolvedAt: json['resolved_at'] != null
          ? DateTime.tryParse(json['resolved_at'].toString())
          : null,
      resolutionNotes: json['resolution_notes']?.toString(),
      reporterName: json['reporter_name']?.toString(),
      reporterPhone: json['reporter_phone']?.toString(),
      photoUrl: json['photo_url']?.toString(),
      attachmentUrls: urls,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reference_number': referenceNumber,
      'incident_type': incidentType,
      'status': status,
      'description': description,
      'address': address,
      'lat': lat,
      'lng': lng,
      'is_emergency': isEmergency,
      'created_at': createdAt.toIso8601String(),
      'resolved_at': resolvedAt?.toIso8601String(),
      'resolution_notes': resolutionNotes,
      'reporter_name': reporterName,
      'reporter_phone': reporterPhone,
      'photo_url': photoUrl,
      'attachments': attachmentUrls.map((u) => {'url': u}).toList(),
    };
  }

  String get readableType {
    switch (incidentType) {
      case 'WaterLeak':
        return 'Water Pipe Leak';
      case 'SewerBurst':
        return 'Sewer Overflow';
      case 'RoadDamage':
        return 'Pothole / Road Damage';
      case 'StreetLight':
        return 'Street Light Fault';
      case 'Ambulance':
        return 'Medical Emergency';
      case 'Fire':
        return 'Fire Outbreak';
      case 'Disaster':
        return 'Civil Disaster';
      default:
        return incidentType;
    }
  }

  String get statusDisplay {
    switch (status) {
      case 'New':
        return 'Logged';
      case 'Assigned':
        return 'Assigned';
      case 'InProgress':
        return 'In Progress';
      case 'Resolved':
        return 'Resolved';
      case 'Closed':
        return 'Closed';
      default:
        return status;
    }
  }
}
