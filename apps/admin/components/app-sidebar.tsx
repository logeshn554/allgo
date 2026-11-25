'use client';

import {
  HugeiconsIcon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@allgo/ui';
import {
  ArrowRight01Icon,
  Car01Icon,
  Coins01Icon,
  CustomerServiceIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  Key01Icon,
  Location01Icon,
  Motorbike01Icon,
  Package01Icon,
  PackageIcon,
  Shield01Icon,
  StarIcon,
  Store01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview & Logistics',
    items: [
      { title: 'Dashboard', url: '/admin/dashboard', icon: DashboardSquare01Icon },
      { title: 'Multi-Vertical Orders', url: '/admin/orders', icon: ArrowRight01Icon },
      { title: 'Dispatch Operations', url: '/admin/dispatch', icon: DeliveryTruck01Icon },
    ],
  },
  {
    label: 'Partner & Outlets',
    items: [
      { title: 'Partner Approvals', url: '/admin/partners', icon: Motorbike01Icon },
      { title: 'Merchant Approvals', url: '/admin/merchants', icon: Store01Icon },
      { title: 'Catalog Moderation', url: '/admin/catalog', icon: PackageIcon },
    ],
  },
  {
    label: 'Vertical Services',
    items: [
      { title: 'Mobility & Rides', url: '/admin/mobility', icon: Car01Icon },
      { title: 'Parcel Courier', url: '/admin/parcels', icon: Package01Icon },
    ],
  },
  {
    label: 'Governance & Settings',
    items: [
      { title: 'Pilot Service Zones', url: '/admin/zones', icon: Location01Icon },
      { title: 'Users & Roles', url: '/admin/users', icon: UserGroupIcon },
      { title: 'Auth & OAuth', url: '/admin/auth-settings', icon: Shield01Icon },
      { title: 'Account Security', url: '/admin/security', icon: Key01Icon },
      { title: 'Financial Management', url: '/admin/finance', icon: Coins01Icon },
      { title: 'Customer Support', url: '/admin/support', icon: CustomerServiceIcon },
      { title: 'Ratings & Reviews', url: '/admin/ratings', icon: StarIcon },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-base">
                A
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight text-sidebar-foreground">
                  AllGo Super Admin
                </span>
                <span className="truncate text-[11px] text-muted-foreground">Console v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.url} />}
                      >
                        <HugeiconsIcon
                          icon={item.icon}
                          strokeWidth={2}
                          className={`size-4 shrink-0 ${isActive ? 'text-sidebar-accent-foreground' : 'text-muted-foreground'}`}
                        />
                        <span className="truncate">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="text-xs text-muted-foreground flex items-center justify-between border-t border-sidebar-border pt-2 px-1">
          <span className="font-mono text-[11px]">AllGo Platform</span>
          <span className="size-2 rounded-full bg-primary animate-pulse" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
