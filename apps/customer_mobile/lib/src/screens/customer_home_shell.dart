import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'account_screen.dart';

class CustomerHomeShell extends ConsumerStatefulWidget {
  const CustomerHomeShell({super.key});

  @override
  ConsumerState<CustomerHomeShell> createState() => _CustomerHomeShellState();
}

class _CustomerHomeShellState extends ConsumerState<CustomerHomeShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AllGoColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildHomeScreen(user),
          const Center(child: AllGoEmptyView(title: 'No Active Orders', message: 'Your active deliveries and rides will appear here.', icon: Icons.receipt_long_outlined)),
          const Center(child: AllGoEmptyView(title: 'Search & Explore', message: 'Discover restaurants, dark stores, and package courier points.', icon: Icons.search)),
          const AccountScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AllGoColors.surface,
          border: Border(top: BorderSide(color: AllGoColors.divider, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: AllGoColors.surface,
          selectedItemColor: AllGoColors.primary,
          unselectedItemColor: AllGoColors.textTertiary,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), label: 'Orders'),
            BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Explore'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Account'),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeScreen(User? user) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: AllGoColors.primary, size: 20),
                        const SizedBox(width: 4),
                        Text('Chennai Pilot Zone', style: AllGoTypography.heading3.copyWith(fontSize: 16)),
                        const Icon(Icons.keyboard_arrow_down, size: 18),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text('Anna Nagar / Kilpauk, Tamil Nadu', style: AllGoTypography.caption),
                  ],
                ),
                CircleAvatar(
                  backgroundColor: AllGoColors.primaryLight.withOpacity(0.3),
                  child: Text(
                    (user?.fullName != null && user!.fullName!.isNotEmpty)
                        ? user.fullName![0].toUpperCase()
                        : 'U',
                    style: const TextStyle(color: AllGoColors.primaryDark, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Promotional Banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AllGoColors.primary, AllGoColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('All Services in One App', style: AllGoTypography.heading3.copyWith(color: AllGoColors.textInverse)),
                        const SizedBox(height: 6),
                        Text(
                          'Order food, quick groceries, courier parcels, or book rides with zero surge switching.',
                          style: AllGoTypography.caption.copyWith(color: AllGoColors.textInverse.withOpacity(0.9)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.electric_moped, size: 48, color: AllGoColors.textInverse),
                ],
              ),
            ),
            const SizedBox(height: 28),

            Text('AllGo Services', style: AllGoTypography.heading2),
            const SizedBox(height: 16),

            // Multi-Vertical Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              childAspectRatio: 1.15,
              children: [
                _buildServiceCard('Food Delivery', 'Restaurants & Cloud Kitchens', Icons.restaurant, AllGoColors.primary),
                _buildServiceCard('Quick Grocery', 'Instant 15-min Dark Stores', Icons.local_grocery_store, AllGoColors.secondary),
                _buildServiceCard('City Parcel', 'Package & Document Courier', Icons.inventory_2, Colors.purple),
                _buildServiceCard('Mobility Rides', 'Auto, Cab & Bike Taxi', Icons.directions_car, Colors.blue),
                _buildServiceCard('Hire Driver', 'Verified Drivers for Your Car', Icons.sports_motorsports, Colors.teal),
                _buildServiceCard('Home Kitchens', 'Authentic Home Cooked Food', Icons.soup_kitchen, Colors.deepOrange),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceCard(String title, String subtitle, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AllGoColors.divider, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const Spacer(),
          Text(title, style: AllGoTypography.heading3.copyWith(fontSize: 16)),
          const SizedBox(height: 4),
          Text(subtitle, style: AllGoTypography.caption, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
