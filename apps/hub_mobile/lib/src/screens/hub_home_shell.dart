import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class HubHomeShell extends StatelessWidget {
  const HubHomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    return FScaffold(
      header: const FHeader(
        title: Text('AllGo Hub Operations'),
      ),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ShadCard(
            title: Text('Inbound & Outbound Manifests'),
            description: Text('Scan, sort, and stage parcels across city micro-hubs.'),
          ),
          SizedBox(height: 12),
          ShadCard(
            title: Text('Fleet Dispatch Staging'),
            description: Text('Assign batched routes to nearby delivery partners.'),
          ),
          SizedBox(height: 12),
          ShadCard(
            title: Text('Hub SLA & Exceptions'),
            description: Text('Monitor turnaround times and resolve delayed handoffs.'),
          ),
        ],
      ),
    );
  }
}
