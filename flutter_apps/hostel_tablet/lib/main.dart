import 'package:flutter/material.dart';

void main() {
  runApp(const HostelTabletKioskApp());
}

class HostelTabletKioskApp extends StatelessWidget {
  const HostelTabletKioskApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HostelConnect Kiosk',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF06B6D4),
        ),
      ),
      home: const StudentPinLoginScreen(),
    );
  }
}

class StudentPinLoginScreen extends StatefulWidget {
  const StudentPinLoginScreen({super.key});

  @override
  State<StudentPinLoginScreen> createState() => _StudentPinLoginScreenState();
}

class _StudentPinLoginScreenState extends State<StudentPinLoginScreen> {
  final TextEditingController _studentCodeController = TextEditingController();
  final List<String> _pinDigits = [];

  void _onKeyPress(String digit) {
    if (_pinDigits.length < 4) {
      setState(() {
        _pinDigits.add(digit);
      });
    }
  }

  void _onBackspace() {
    if (_pinDigits.isNotEmpty) {
      setState(() {
        _pinDigits.removeLast();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Row(
          children: [
            // Left Banner (School Branding)
            Expanded(
              flex: 4,
              child: Container(
                color: const Color(0xFF1E293B),
                padding: const EdgeInsets.all(40),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.videocam, size: 48, color: Colors.white),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'HostelConnect Kiosk',
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Delhi Public School - Hostel Block A',
                      style: TextStyle(fontSize: 18, color: Colors.white70),
                    ),
                    const SizedBox(height: 40),
                    const Text(
                      '🔒 Security Notice:\n• Only calls to verified parents permitted.\n• Call recording & audit active.\n• Kiosk mode strictly enforced.',
                      style: TextStyle(color: Colors.white54, height: 1.5),
                    ),
                  ],
                ),
              ),
            ),

            // Right Keypad Login
            Expanded(
              flex: 6,
              child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Student Authentication',
                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: 320,
                      child: TextField(
                        controller: _studentCodeController,
                        textAlign: TextAlign.center,
                        decoration: InputDecoration(
                          hintText: 'Enter Student ID (e.g. STU-1001)',
                          filled: true,
                          fillColor: const Color(0xFF1E293B),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // PIN Dots
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(4, (index) {
                        final isFilled = index < _pinDigits.length;
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isFilled ? const Color(0xFF06B6D4) : Colors.white12,
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 32),

                    // Keypad Grid
                    SizedBox(
                      width: 300,
                      child: GridView.count(
                        shrinkWrap: true,
                        crossAxisCount: 3,
                        childAspectRatio: 1.4,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        children: [
                          ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
                            (num) => ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E293B),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: () => _onKeyPress(num),
                              child: Text(num, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1E293B),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () => _onKeyPress('0'),
                            child: const Text('0', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                          ),
                          IconButton(
                            onPressed: _onBackspace,
                            icon: const Icon(Icons.backspace, color: Colors.redAccent),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: _pinDigits.length == 4
                          ? () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ParentSelectionScreen(
                                    studentCode: _studentCodeController.text.isEmpty
                                        ? 'STU-1001'
                                        : _studentCodeController.text,
                                  ),
                                ),
                              );
                            }
                          : null,
                      icon: const Icon(Icons.login),
                      label: const Text('Login to Call Parent', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ParentSelectionScreen extends StatelessWidget {
  final String studentCode;
  const ParentSelectionScreen({super.key, required this.studentCode});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Select Guardian to Video Call ($studentCode)'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Available Verified Parents / Guardians',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Call rule: Max 15 minutes per session • Allowed today (17:00 - 20:30)',
              style: TextStyle(color: Colors.white60),
            ),
            const SizedBox(height: 24),

            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                childAspectRatio: 2.2,
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                children: [
                  _buildParentCard(
                    context,
                    name: 'Rajesh Sharma',
                    relation: 'Father',
                    phone: '+91 98765 43210',
                    isOnline: true,
                  ),
                  _buildParentCard(
                    context,
                    name: 'Meenakshi Sharma',
                    relation: 'Mother',
                    phone: '+91 98123 45678',
                    isOnline: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParentCard(BuildContext context,
      {required String name, required String relation, required String phone, required bool isOnline}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: const Color(0xFF6366F1),
            child: Text(name[0], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('$relation • $phone', style: const TextStyle(color: Colors.white60, fontSize: 14)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isOnline ? Colors.greenAccent : Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(isOnline ? 'App Online' : 'Offline', style: TextStyle(color: isOnline ? Colors.greenAccent : Colors.grey, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Ringing $name via LiveKit WebRTC...')),
              );
            },
            icon: const Icon(Icons.video_call, color: Colors.white),
            label: const Text('Call', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
